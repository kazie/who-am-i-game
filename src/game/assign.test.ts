import { describe, expect, it } from 'vitest'
import { assignEntries } from './assign'
import { seededRandom } from './random'

describe('assignEntries', () => {
  it.each([2, 3, 5, 10])('is a derangement and a bijection for %i players', (n) => {
    const ids = Array.from({ length: n }, (_, i) => `p${i}`)
    for (let seed = 1; seed < 50; seed++) {
      const a = assignEntries(ids, seededRandom(seed))
      expect(Object.keys(a).sort()).toEqual([...ids].sort())
      expect(new Set(Object.values(a)).size).toBe(n)
      for (const id of ids) expect(a[id]).not.toBe(id)
    }
  })

  it('swaps two players', () => {
    expect(assignEntries(['a', 'b'])).toEqual({ a: 'b', b: 'a' })
  })

  it('rejects fewer than two players', () => {
    expect(() => assignEntries(['a'])).toThrow()
  })
})
