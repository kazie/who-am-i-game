// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { browserSeatGuard } from './seats'

// Two guards in one process share Web Locks, like two tabs of one browser would.
describe('browserSeatGuard', () => {
  it('lets one tab hold a seat and tells a duplicate it is taken, straight away', async () => {
    const original = browserSeatGuard()
    const duplicate = browserSeatGuard()
    const start = performance.now()
    expect(await original.claim('seat-1')).toBe(true)
    expect(await duplicate.claim('seat-1')).toBe(false)
    expect(await duplicate.claim('seat-2')).toBe(true)
    expect(performance.now() - start).toBeLessThan(50) // no waiting for replies
    original.release('seat-1')
    expect(await duplicate.claim('seat-1')).toBe(true)
    duplicate.release('seat-1')
    duplicate.release('seat-2')
  })

  it('a tab claiming its own seat again keeps it', async () => {
    const tab = browserSeatGuard()
    expect(await tab.claim('seat-3')).toBe(true)
    expect(await tab.claim('seat-3')).toBe(true)
    tab.release('seat-3')
  })
})
