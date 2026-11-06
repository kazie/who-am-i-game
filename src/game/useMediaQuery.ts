import { onScopeDispose, ref, type Ref } from 'vue'

type MatchMedia = (
  query: string,
) => Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>

const browserMatchMedia = (): MatchMedia | null =>
  typeof window !== 'undefined' && window.matchMedia ? (q) => window.matchMedia(q) : null

/** Whether a CSS media query matches, kept up to date. False where matchMedia is missing. */
export function useMediaQuery(
  query: string,
  matchMedia: MatchMedia | null = browserMatchMedia(),
): Ref<boolean> {
  const list = matchMedia?.(query)
  const matches = ref(list?.matches ?? false)
  if (!list) return matches
  const update = (e: MediaQueryListEvent) => (matches.value = e.matches)
  list.addEventListener('change', update)
  onScopeDispose(() => list.removeEventListener('change', update))
  return matches
}
