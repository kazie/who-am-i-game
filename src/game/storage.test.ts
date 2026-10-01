import { afterEach, describe, expect, it, vi } from 'vitest'
import { browserStorage } from './storage'

describe('browserStorage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shares one fallback store when sessionStorage is blocked', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    browserStorage().setItem('k', 'v')
    expect(browserStorage().getItem('k')).toBe('v')
  })
})
