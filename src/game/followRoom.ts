import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import type { Bridge } from '../bridge/types'
import type { GameState } from './protocol'
import { acceptSnapshot, roomTopic } from './protocol'
import { AWAY_AFTER_MS } from './reducer'

export const HEARTBEAT_MS = 10_000

export interface FollowHooks {
  /** The relay owns the state: it ignores snapshots and gets every message instead. */
  isRelay?: () => boolean
  onMessage?: (data: unknown) => void
  /** A newer snapshot was accepted. */
  onSnapshot?: (state: GameState) => void
  /** The connection (re)opened: time to ask for, or send, a snapshot. */
  onOpen?: () => void
  /** Every heartbeat, and when a background tab becomes visible again. */
  onBeat?: () => void
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

  function onData(data: unknown) {
    if (isRelay()) return hooks.onMessage?.(data)
    const next = acceptSnapshot(state.value, data, code)
    if (!next) return
    state.value = next
    lastStateAt.value = now()
    hooks.onSnapshot?.(next)
  }

  function beat() {
    clock.value = now()
    hooks.onBeat?.()
  }

  const cleanups: (() => void)[] = []
  onScopeDispose(() => cleanups.splice(0).forEach((f) => f()))

  function start() {
    // We may have started late: catch up on what the connection did meanwhile.
    connection.value = bridge.status
    const timer = setInterval(beat, HEARTBEAT_MS)
    cleanups.push(
      bridge.subscribe(roomTopic(code), onData),
      bridge.onStatus((s) => {
        connection.value = s
        if (s === 'open') hooks.onOpen?.()
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

  return { state, connection, hostAlive, start }
}
