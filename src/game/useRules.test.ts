import { describe, expect, it } from 'vitest'
import { memoryStorage } from './storage'
import { RULES_KEY, useRules } from './useRules'

describe('useRules', () => {
  it('is asked once per browser', () => {
    const storage = memoryStorage()
    const first = useRules(storage)
    expect(first.seen.value).toBe(false)
    first.accept()
    expect(first.seen.value).toBe(true)
    expect(storage.getItem(RULES_KEY)).toBe('yes')
    expect(useRules(storage).seen.value).toBe(true)
  })
})
