import { computed, onScopeDispose, ref } from 'vue'
import type { Bridge } from '../bridge/types'
import { randomId } from './ids'
import type { ClientMessage, Entry, GameState, StateMessage } from './protocol'
import { followRoom, HEARTBEAT_MS } from './followRoom'
import { isClientMessage, roomTopic } from './protocol'
import {
  AWAY_AFTER_MS,
  can,
  createRoom,
  nextRelays,
  playerById,
  reduce,
  shiftClock,
  takeOver,
} from './reducer'
import type { SeatGuard } from './seats'
import { readJson, writeJson, type KeyValueStorage } from './storage'

/** This tab's seat. Whether it relays the room is in the state (`hostId`), not here. */
export interface Identity {
  playerId: string
  name: string
}

export interface RoomDeps {
  bridge: Bridge
  storage: KeyValueStorage
  now?: () => number
  rng?: () => number
  /** Detects duplicated tabs; without it every tab is trusted with its stored seat. */
  seats?: SeatGuard
}

export { HEARTBEAT_MS }

/**
 * When the relay goes quiet, the first player in line takes over after AWAY_AFTER_MS, the
 * next one this much later, and so on: by then they normally hear the first one's snapshot.
 */
export const TAKEOVER_STAGGER_MS = 2 * HEARTBEAT_MS

export const storageKeys = {
  identity: (code: string) => `who-am-i:${code}:me`,
  state: (code: string) => `who-am-i:${code}:state`,
}

/** Creates a room in this tab, which starts as its relay. */
export function hostRoom(
  opts: { code: string; theme: string; name: string; pack?: string },
  deps: Pick<RoomDeps, 'storage' | 'now'>,
) {
  const playerId = randomId()
  const state = createRoom({
    code: opts.code,
    theme: opts.theme,
    hostId: playerId,
    hostName: opts.name,
    pack: opts.pack,
    now: (deps.now ?? Date.now)(),
  })
  const identity: Identity = { playerId, name: opts.name.trim() }
  writeJson(deps.storage, storageKeys.identity(opts.code), identity)
  writeJson(deps.storage, storageKeys.state(opts.code), state)
  return state
}

/** Remembers a name for a room this tab is about to open as a player. */
export function joinRoom(code: string, name: string, storage: KeyValueStorage) {
  const existing = readJson<Identity>(storage, storageKeys.identity(code))
  if (existing) return existing
  const identity: Identity = { playerId: randomId(), name: name.trim() }
  writeJson(storage, storageKeys.identity(code), identity)
  return identity
}

/**
 * Saved lastSeen times are stale (pings aren't persisted, and the tab was gone): treat
 * everyone as just seen, or they would all count as away until their next ping.
 */
function resume(state: GameState, now: number): GameState {
  return { ...state, players: state.players.map((p) => ({ ...p, lastSeen: now })) }
}

/**
 * One player's view of a room. One player's tab is also the relay (the creator's, until it
 * leaves or goes quiet): it owns the state, runs every message (its own included) through
 * the reducer and broadcasts snapshots.
 */
export function useRoom(code: string, deps: RoomDeps) {
  const { bridge, storage } = deps
  const now = deps.now ?? Date.now
  const rng = deps.rng ?? Math.random
  const topic = roomTopic(code)
  const identityKey = storageKeys.identity(code)
  const stateKey = storageKeys.state(code)

  const identity = ref<Identity | null>(readJson<Identity>(storage, identityKey))
  const myId = () => identity.value?.playerId

  // Only the relay keeps the state. A tab that relayed before a reload resumes it; if the
  // relay moved on meanwhile, its snapshots win (higher version) and this tab follows.
  const stored = readJson<GameState>(storage, stateKey)
  const saved = stored && stored.hostId === myId() ? resume(stored, now()) : null
  if (stored && !saved) storage.removeItem(stateKey)

  const room = followRoom(
    code,
    { bridge, now },
    {
      isRelay: () => isRelay.value,
      onMessage: (data) => isClientMessage(data) && data.from !== myId() && dispatch(data),
      onSnapshot,
      onRival: () => broadcast(),
      onWake,
      onOpen: greet,
      onBeat: beat,
    },
    saved,
  )
  const { state } = room
  let lastHello = { version: -1, at: 0 }

  const isRelay = computed(() => state.value !== null && state.value.hostId === myId())
  const me = computed(() => (state.value ? playerById(state.value, myId()) : undefined))
  const kicked = computed(() => {
    const id = myId()
    return id !== undefined && (state.value?.kicked.includes(id) ?? false)
  })

  // ---- relay (one player's tab) ----

  function publishState() {
    if (!state.value) return
    state.value = { ...state.value, sentAt: now() }
    const s = state.value
    const msg: StateMessage = { type: 'state', from: myId() ?? s.hostId, state: s }
    // A stale snapshot is useless: a fresh one goes out on reconnect. Except the last one
    // this tab sends, closing the room or handing it on: nothing would resend that, so it
    // is queued until we are back online.
    const last = s.closed === true || s.hostId !== myId()
    bridge.publish(topic, msg, { echo: false, volatile: !last })
  }

  function broadcast() {
    if (isRelay.value) publishState()
  }

  /** This tab relays from now on: from a handoff, or by taking over. */
  function becomeRelay(s: GameState) {
    state.value = s
    writeJson(storage, stateKey, s)
    publishState()
  }

  function dispatch(msg: ClientMessage) {
    const before = state.value
    if (!before || !isRelay.value) return
    const next = reduce(before, msg, { now: now(), rng })
    state.value = next
    // Same version: at most lastSeen changed (a ping), which rides on the next heartbeat.
    const changed = next.version !== before.version
    if (changed) {
      // Leaving hands the room on: then it is no longer ours to keep.
      if (next.hostId === myId()) writeJson(storage, stateKey, next)
      else storage.removeItem(stateKey)
    }
    // A hello or watch always gets a snapshot, so (re)joining players and screens catch up.
    if (changed || msg.type === 'hello' || msg.type === 'watch') publishState()
  }

  function onSnapshot(next: GameState) {
    if (next.hostId === myId()) {
      // The relay left and handed the room to us. Its lastSeen times are on its clock.
      becomeRelay(shiftClock(next, now() - next.sentAt))
      return
    }
    // If we were relaying, a newer relay won: stop keeping the state.
    storage.removeItem(stateKey)
    maybeHello(next)
  }

  /**
   * The relay has been quiet too long (crashed, closed, asleep): the first player in line
   * who is around takes over, the next one a bit later if that didn't happen, and so on.
   */
  function maybeTakeOver() {
    const s = state.value
    const id = myId()
    if (!s || !id || isRelay.value || s.closed || bridge.status !== 'open') return
    const rank = nextRelays(s, s.sentAt).findIndex((p) => p.id === id)
    if (rank < 0 || room.quietFor() < AWAY_AFTER_MS + rank * TAKEOVER_STAGGER_MS) return
    // On our clock the old relay was last heard when its last snapshot arrived, so it
    // counts as away right away and doesn't hold up votes or turns.
    becomeRelay(takeOver(shiftClock(s, room.lastStateAt() - s.sentAt), id))
  }

  /** A relay that was asleep must not count everyone as gone because of its own nap. */
  function onWake() {
    if (isRelay.value && state.value) state.value = resume(state.value, now())
  }

  // ---- every player ----

  function send(msg: ClientMessage, opts: { volatile?: boolean } = {}) {
    if (isRelay.value) dispatch(msg)
    else bridge.publish(topic, msg, { echo: false, ...opts })
  }

  /** Heartbeat-like: dropped while offline, since one is sent on reconnect anyway. */
  function hello() {
    if (identity.value)
      send(
        { type: 'hello', from: identity.value.playerId, name: identity.value.name },
        { volatile: true },
      )
  }

  /** The relay sends snapshots, players say hello. */
  function greet() {
    if (isRelay.value) broadcast()
    else hello()
  }

  /**
   * The bridge has no history and drops messages sent before the relay subscribed: until
   * a snapshot lists us, say hello again, if the rules would let us in at all. At most once
   * per heartbeat for the same version: the relay answers every hello, so answering each
   * answer would be an endless loop.
   */
  function maybeHello(next: GameState) {
    const id = myId()
    if (!identity.value || !id || me.value) return
    const letsUsIn = can(next, { type: 'hello', from: id, name: identity.value.name })
    const fresh = next.version !== lastHello.version || now() - lastHello.at >= HEARTBEAT_MS
    if (!letsUsIn || !fresh) return
    lastHello = { version: next.version, at: now() }
    hello()
  }

  function beat() {
    maybeTakeOver()
    const id = myId()
    if (!id) return
    // An offline relay keeps its clock still: time passing would decide votes nobody saw.
    if (isRelay.value && bridge.status !== 'open') return
    send({ type: 'ping', from: id }, { volatile: true })
    broadcast()
  }

  let disposed = false
  onScopeDispose(() => {
    disposed = true
    const id = myId()
    if (id) deps.seats?.release(id)
  })

  function goOnline() {
    room.start()
    greet()
  }

  const storedSeat = myId()
  if (deps.seats && storedSeat) {
    void deps.seats.claim(storedSeat).then((mine) => {
      if (disposed) return
      if (!mine) {
        // A duplicated tab: the copied seat belongs to the original. Start over instead.
        storage.removeItem(identityKey)
        storage.removeItem(stateKey)
        identity.value = null
        state.value = null
      }
      goOnline()
    })
  } else {
    goOnline()
  }

  /** Sends a message from this player; does nothing before joining. */
  function act<T extends ClientMessage['type']>(
    type: T,
    extra: Omit<Extract<ClientMessage, { type: T }>, 'type' | 'from'>,
  ) {
    const id = myId()
    if (id) send({ type, from: id, ...extra } as ClientMessage)
  }

  return {
    code,
    state,
    identity,
    me,
    kicked,
    /** This tab relays the room right now. */
    isRelay,
    hostAlive: room.hostAlive,
    /** The relay changed a moment ago (handoff or takeover). */
    relayChanged: room.relayChanged,
    connection: room.connection,

    join(name: string) {
      if (identity.value) return
      identity.value = joinRoom(code, name, storage)
      void deps.seats?.claim(identity.value.playerId)
      hello()
    },
    /** The relay hands the room on, or closes it if nobody is around (the reducer's 'leave'). */
    leave() {
      act('leave', {})
      const id = myId()
      if (id) deps.seats?.release(id)
      storage.removeItem(identityKey)
      storage.removeItem(stateKey)
      identity.value = null
    },

    // Every player has the same controls; the reducer decides what is allowed.
    startWriting: () => act('startWriting', {}),
    submit: (entry: Entry) => act('submit', { entry }),
    deal: () => act('deal', {}),
    guess: () => act('guess', {}),
    withdrawGuess: () => act('withdrawGuess', {}),
    vote: (correct: boolean) => act('vote', { correct }),
    pass: () => act('pass', {}),
    voteToEnd: (end: boolean) => act('endVote', { end }),
    voteToFinish: (finish: boolean) => act('finishVote', { finish }),
    kick: (playerId: string) => act('kick', { playerId }),
    newRound: (theme: string, pack?: string) =>
      act('newRound', { theme, ...(pack ? { pack } : {}) }),
  }
}

export type Room = ReturnType<typeof useRoom>
