import { describe, expect, it } from 'vitest'
import { assignEntries, pickDistinct } from './assign'
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

describe('pickDistinct', () => {
  const items = ['a', 'b', 'c', 'd', 'e']

  it('picks n different items', () => {
    for (let seed = 1; seed < 50; seed++) {
      const picked = pickDistinct(items, 3, seededRandom(seed))
      expect(picked).toHaveLength(3)
      expect(new Set(picked).size).toBe(3)
      for (const x of picked) expect(items).toContain(x)
    }
  })

  it('can pick every item, and leaves the input alone', () => {
    expect([...pickDistinct(items, 5, seededRandom(3))].sort()).toEqual(items)
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('reaches every item', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed < 100; seed++) seen.add(pickDistinct(items, 1, seededRandom(seed))[0]!)
    expect(seen.size).toBe(items.length)
  })

  it('refuses to pick more than there are', () => {
    expect(() => pickDistinct(items, 6)).toThrow()
  })
})
