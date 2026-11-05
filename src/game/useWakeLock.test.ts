import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useWakeLock, type WakeLockApi } from './useWakeLock'

/** A sentinel the "browser" can release, like when the tab is hidden. */
class FakeSentinel extends EventTarget {
  released = false
  release = vi.fn(async () => {
    this.released = true
    this.dispatchEvent(new Event('release'))
  })
}

function setup(opts: { api?: boolean; failing?: boolean } = {}) {
  const sentinels: FakeSentinel[] = []
  const request = vi.fn(async () => {
    if (opts.failing) throw new DOMException('Low battery', 'NotAllowedError')
    const s = new FakeSentinel()
    sentinels.push(s)
    return s
  })
  const wakeLock: WakeLockApi | undefined = opts.api === false ? undefined : { request }
  const doc = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
  })
  const active = ref(true)
  const scope = effectScope()
  const { held } = scope.run(() => useWakeLock(() => active.value, { wakeLock, document: doc }))!
  const settle = async () => {
    for (let i = 0; i < 3; i++) await Promise.resolve()
    await nextTick()
  }
  const setVisible = async (visible: boolean) => {
    doc.visibilityState = visible ? 'visible' : 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    await settle()
  }
  return { request, sentinels, active, held, scope, settle, setVisible }
}

describe('useWakeLock', () => {
  it('keeps the screen on while active, and lets go when not', async () => {
    const t = setup()
    await t.settle()
    expect(t.request).toHaveBeenCalledWith('screen')
    expect(t.held.value).toBe(true)
    t.active.value = false
    await t.settle()
    expect(t.sentinels[0]!.release).toHaveBeenCalled()
    expect(t.held.value).toBe(false)
  })

  it('takes the lock again when the tab comes back', async () => {
    const t = setup()
    await t.settle()
    // Hiding the tab: the browser releases the lock by itself.
    await t.sentinels[0]!.release()
    await t.setVisible(false)
    expect(t.held.value).toBe(false)
    expect(t.request).toHaveBeenCalledTimes(1)
    await t.setVisible(true)
    expect(t.request).toHaveBeenCalledTimes(2)
    expect(t.held.value).toBe(true)
  })

  it('does not ask while the tab is hidden', async () => {
    const t = setup()
    await t.settle()
    t.active.value = false
    await t.setVisible(false)
    t.active.value = true
    await t.settle()
    expect(t.request).toHaveBeenCalledTimes(1)
  })

  it('lets go when the room goes away', async () => {
    const t = setup()
    await t.settle()
    t.scope.stop()
    expect(t.sentinels[0]!.release).toHaveBeenCalled()
  })

  it('shrugs off a refusal, or a browser without the API', async () => {
    const refused = setup({ failing: true })
    await refused.settle()
    expect(refused.held.value).toBe(false)
    const missing = setup({ api: false })
    await missing.settle()
    expect(missing.held.value).toBe(false)
  })
})
