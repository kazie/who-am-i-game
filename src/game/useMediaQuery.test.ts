import { describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { useMediaQuery } from './useMediaQuery'

function fakeMatchMedia(initial: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const list = {
    matches: initial,
    addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.add(l),
    removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.delete(l),
  } as unknown as MediaQueryList
  return {
    matchMedia: () => list,
    listeners,
    fire: (matches: boolean) => listeners.forEach((l) => l({ matches } as MediaQueryListEvent)),
  }
}

describe('useMediaQuery', () => {
  it('follows the query and stops listening when its scope ends', () => {
    const media = fakeMatchMedia(true)
    const scope = effectScope()
    const narrow = scope.run(() => useMediaQuery('(max-width: 720px)', media.matchMedia))!
    expect(narrow.value).toBe(true)
    media.fire(false)
    expect(narrow.value).toBe(false)
    scope.stop()
    expect(media.listeners.size).toBe(0)
  })

  it('is false without matchMedia', () => {
    const narrow = effectScope().run(() => useMediaQuery('(max-width: 720px)', null))!
    expect(narrow.value).toBe(false)
  })
})
