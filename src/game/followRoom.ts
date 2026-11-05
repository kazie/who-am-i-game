import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { Bridge } from '../bridge/types'
import type { GameState } from './protocol'
import { acceptSnapshot, isStateMessage, roomTopic } from './protocol'
import { AWAY_AFTER_MS } from './reducer'

export const HEARTBEAT_MS = 10_000

export interface FollowHooks {
  /** The relay owns the state: it gets every message, and answers rival relays. */
  isRelay?: () => boolean
  onMessage?: (data: unknown) => void
  /** A newer snapshot was accepted (by the relay too: it then steps down). */
  onSnapshot?: (state: GameState) => void
  /** The relay saw another relay's snapshot that lost to its own state. */
  onRival?: () => void
  /** The connection (re)opened: time to ask for, or send, a snapshot. */
  onOpen?: () => void
  /** Every heartbeat, and when a background tab becomes visible again. */
  onBeat?: () => void
  /** The tab was asleep (or its timers frozen) for a while; runs before that beat. */
  onWake?: () => void
}

/**
 * What every tab in a room shares, players, relay and presentation screens alike: the
 * room's latest snapshot, the connection, a heartbeat, and whether the relay is still
 * there. Nothing happens on the network until `start()`.
 */
export function followRoom(
  code: string,
  deps: { bridge: Bridge; now?: () => number },
  hooks: FollowHooks = {},
  initial: GameState | null = null,
) {
  const { bridge } = deps
  const now = deps.now ?? Date.now
  const isRelay = hooks.isRelay ?? (() => false)

  const state = shallowRef<GameState | null>(initial)
  const lastStateAt = ref(0)
  const clock = ref(now())
  const connection = ref(bridge.status)
  const hostAlive = computed(
    () => isRelay() || (state.value !== null && clock.value - lastStateAt.value < AWAY_AFTER_MS),
  )

  // Since when this tab has been able to hear the room. A tab that was offline or asleep
  // can't tell whether the relay was quiet meanwhile, so it starts counting again.
  let listeningSince = now()
  let lastBeat = now()
  /** How long the room has been silent, as far as this tab can tell. */
  const quietFor = () => now() - Math.max(lastStateAt.value, listeningSince)

  // When the relay last changed, for a short notice to the players.
  const relayChangedAt = ref<number | null>(null)
  watch(
    () => state.value?.hostId,
    (id, old) => {
      if (old && id && id !== old) relayChangedAt.value = now()
    },
  )
  const relayChanged = computed(
    () => relayChangedAt.value !== null && clock.value - relayChangedAt.value < AWAY_AFTER_MS,
  )

  function onData(data: unknown) {
    const next = acceptSnapshot(state.value, data, code)
    if (next) {
      state.value = next
      lastStateAt.value = now()
      hooks.onSnapshot?.(next)
      return
    }
    if (!isRelay()) return
    if (isStateMessage(data)) {
      // Another tab relays this room too, from a state that lost: show it ours.
      if (data.state.code === code) hooks.onRival?.()
    } else hooks.onMessage?.(data)
  }

  function beat() {
    const t = now()
    // Hidden tabs still beat about once a minute: a longer gap means we were asleep.
    if (t - lastBeat > AWAY_AFTER_MS) {
      listeningSince = t
      hooks.onWake?.()
    }
    lastBeat = t
    clock.value = t
    hooks.onBeat?.()
  }

  const cleanups: (() => void)[] = []
  onScopeDispose(() => cleanups.splice(0).forEach((f) => f()))

  function start() {
    // We may have started late: catch up on what the connection did meanwhile.
    connection.value = bridge.status
    listeningSince = lastBeat = now()
    const timer = setInterval(beat, HEARTBEAT_MS)
    cleanups.push(
      bridge.subscribe(roomTopic(code), onData),
      bridge.onStatus((s) => {
        connection.value = s
        if (s === 'open') {
          listeningSince = now()
          hooks.onOpen?.()
        }
      }),
      () => clearInterval(timer),
    )
    // Background tabs get throttled timers: check in as soon as we are visible again.
    if (typeof document !== 'undefined') {
      const onVisible = () => document.visibilityState === 'visible' && beat()
      document.addEventListener('visibilitychange', onVisible)
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisible))
    }
  }

  return {
    state,
    connection,
    hostAlive,
    relayChanged,
    start,
    quietFor,
    lastStateAt: () => lastStateAt.value,
  }
}
