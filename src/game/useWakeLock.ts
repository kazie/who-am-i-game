import { onScopeDispose, ref, watch } from 'vue'

type Listen = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>

/** The parts of the Screen Wake Lock API this uses (navigator.wakeLock). */
export interface WakeLockApi {
  request(type: 'screen'): Promise<Listen & { release(): Promise<void>; released?: boolean }>
}

export interface WakeLockDeps {
  /** Missing in browsers without the API (and outside https/localhost). */
  wakeLock?: WakeLockApi
  document?: Listen & { visibilityState: DocumentVisibilityState }
}

const browserDeps = (): WakeLockDeps => ({
  wakeLock: typeof navigator === 'undefined' ? undefined : navigator.wakeLock,
  document: typeof document === 'undefined' ? undefined : document,
})

/**
 * Keeps the screen on while `active()` is true, so a phone or laptop that would otherwise
 * go to sleep keeps the room running (the relay) or the game on screen. The browser lets
 * go of the lock whenever the tab is hidden, so it is taken again when the tab comes back.
 * Where the API is missing or refuses (low battery, say), nothing happens.
 */
export function useWakeLock(active: () => boolean, deps: WakeLockDeps = browserDeps()) {
  const { wakeLock, document: doc } = deps
  const held = ref(false)
  let sentinel: Awaited<ReturnType<WakeLockApi['request']>> | undefined
  let pending = false
  let disposed = false

  const onReleased = () => {
    sentinel = undefined
    held.value = false
  }

  async function acquire() {
    if (!wakeLock || sentinel || pending) return
    if (doc && doc.visibilityState !== 'visible') return
    pending = true
    try {
      const s = await wakeLock.request('screen')
      // Things may have changed while we waited.
      if (!active() || disposed) {
        void s.release().catch(() => {})
        return
      }
      sentinel = s
      s.addEventListener('release', onReleased)
      held.value = true
    } catch {
      /* not allowed right now: fine */
    } finally {
      pending = false
    }
  }

  function release() {
    const s = sentinel
    if (!s) return
    s.removeEventListener('release', onReleased)
    onReleased()
    void s.release().catch(() => {})
  }

  const sync = () => (active() ? void acquire() : release())
  watch(active, sync, { immediate: true })

  const onVisible = () => doc?.visibilityState === 'visible' && sync()
  doc?.addEventListener('visibilitychange', onVisible)

  onScopeDispose(() => {
    disposed = true
    doc?.removeEventListener('visibilitychange', onVisible)
    release()
  })

  return { held }
}
