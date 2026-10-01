import { computed, onScopeDispose, ref } from 'vue'
import type { Bridge } from '../bridge/types'
import { randomId } from './ids'
import type { ClientMessage, Entry, GameState, StateMessage } from './protocol'
import { followRoom, HEARTBEAT_MS } from './followRoom'
import { isClientMessage, roomTopic } from './protocol'
import { can, createRoom, playerById, reduce } from './reducer'
import type { SeatGuard } from './seats'
import { readJson, writeJson, type KeyValueStorage } from './storage'

export interface Identity {
  playerId: string
  name: string
  host: boolean
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

export const storageKeys = {
  identity: (code: string) => `who-am-i:${code}:me`,
  state: (code: string) => `who-am-i:${code}:state`,
}

/** Creates a room in this tab, which becomes its relay. */
export function hostRoom(
  opts: { code: string; theme: string; name: string },
  deps: Pick<RoomDeps, 'storage' | 'now'>,
) {
  const playerId = randomId()
  const state = createRoom({
    code: opts.code,
    theme: opts.theme,
    hostId: playerId,
    hostName: opts.name,
    now: (deps.now ?? Date.now)(),
  })
  const identity: Identity = { playerId, name: opts.name.trim(), host: true }
  writeJson(deps.storage, storageKeys.identity(opts.code), identity)
  writeJson(deps.storage, storageKeys.state(opts.code), state)
  return state
}

/** Remembers a name for a room this tab is about to open as a player. */
export function joinRoom(code: string, name: string, storage: KeyValueStorage) {
  const existing = readJson<Identity>(storage, storageKeys.identity(code))
  if (existing) return existing
  const identity: Identity = { playerId: randomId(), name: name.trim(), host: false }
  writeJson(storage, storageKeys.identity(code), identity)
  return identity
}

/**
 * Saved lastSeen times are stale (pings aren't persisted, and the tab was gone): treat
 * everyone as just seen, or they would all count as away until their next ping.
 */
function resume(state: GameState | null, now: number): GameState | null {
  return state && { ...state, players: state.players.map((p) => ({ ...p, lastSeen: now })) }
}

/**
 * One player's view of a room. The creator's tab is also the relay: it owns the state,
 * runs every message (its own included) through the reducer and broadcasts snapshots.
 */
export function useRoom(code: string, deps: RoomDeps) {
  const { bridge, storage } = deps
  const now = deps.now ?? Date.now
  const rng = deps.rng ?? Math.random
  const topic = roomTopic(code)
  const identityKey = storageKeys.identity(code)
  const stateKey = storageKeys.state(code)

  const identity = ref<Identity | null>(readJson<Identity>(storage, identityKey))
  const isHost = computed(() => identity.value?.host === true)
  const saved = isHost.value ? resume(readJson<GameState>(storage, stateKey), now()) : null
  if (isHost.value && !saved) {
    // Lost the room state: forget the host seat and join as a player instead.
    storage.removeItem(identityKey)
    identity.value = null
  }

  const room = followRoom(
    code,
    { bridge, now },
    {
      isRelay: () => isHost.value,
      onMessage: (data) => isClientMessage(data) && data.from !== myId() && dispatch(data),
      onSnapshot: maybeHello,
      onOpen: greet,
      onBeat: beat,
    },
    saved,
  )
  const { state } = room
  let lastHello = { version: -1, at: 0 }

  const myId = () => identity.value?.playerId
  const me = computed(() => (state.value ? playerById(state.value, myId()) : undefined))
  const kicked = computed(() => {
    const id = myId()
    return id !== undefined && (state.value?.kicked.includes(id) ?? false)
  })

  // ---- relay (creator's tab only) ----

  function broadcast() {
    if (!state.value || !isHost.value) return
    state.value = { ...state.value, sentAt: now() }
    const msg: StateMessage = { type: 'state', from: state.value.hostId, state: state.value }
    // A stale snapshot is useless: a fresh one goes out on reconnect. Except the last one:
    // once the room is closed nothing will resend it, so queue it until we are back online.
    bridge.publish(topic, msg, { echo: false, volatile: !state.value.closed })
  }

  function dispatch(msg: ClientMessage) {
    const before = state.value
    if (!before || !isHost.value) return
    const next = reduce(before, msg, { now: now(), rng })
    state.value = next
    // Same version: at most lastSeen changed (a ping), which rides on the next heartbeat.
    const changed = next.version !== before.version
    if (changed) writeJson(storage, stateKey, next)
    // A hello or watch always gets a snapshot, so (re)joining players and screens catch up.
    if (changed || msg.type === 'hello' || msg.type === 'watch') broadcast()
  }

  // ---- every player ----

  function send(msg: ClientMessage, opts: { volatile?: boolean } = {}) {
    if (isHost.value) dispatch(msg)
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
    if (isHost.value) broadcast()
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
    const id = myId()
    if (!id) return
    send({ type: 'ping', from: id }, { volatile: true })
    if (isHost.value) broadcast()
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
    isHost,
    hostAlive: room.hostAlive,
    connection: room.connection,

    join(name: string) {
      if (identity.value) return
      identity.value = joinRoom(code, name, storage)
      void deps.seats?.claim(identity.value.playerId)
      hello()
    },
    /** For the creator this closes the room for everyone (see the reducer's 'leave'). */
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
    newRound: (theme: string) => act('newRound', { theme }),
  }
}

export type Room = ReturnType<typeof useRoom>
