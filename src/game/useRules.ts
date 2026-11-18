import { ref, type Ref } from 'vue'
import type { KeyValueStorage } from './storage'

export const RULES_KEY = 'who-am-i:rules-seen'

/**
 * Whether this browser's player has read the one rule that spoils a game when it's broken:
 * never say what's on someone else's card. Until then the others' cards stay covered.
 */
export interface Rules {
  seen: Ref<boolean>
  accept(): void
}

/** Remembered in localStorage, so it is asked once per browser, not once per room. */
export function useRules(storage: KeyValueStorage): Rules {
  const seen = ref(storage.getItem(RULES_KEY) === 'yes')
  return {
    seen,
    accept() {
      seen.value = true
      storage.setItem(RULES_KEY, 'yes')
    },
  }
}
