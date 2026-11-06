import { ref, watch, type Ref } from 'vue'
import { randomId } from './ids'
import { clip, LIMITS } from './protocol'
import { readJson, writeJson, type KeyValueStorage } from './storage'

export type Answer = 'yes' | 'no' | 'maybe'

/** Something a player learned about their own card, e.g. "Am I an animal?": yes. */
export interface Note {
  id: string
  text: string
  answer?: Answer
}

export const MAX_NOTES = 50

/** One list per round: a new card starts a clean list. */
export const notesKey = (code: string, round: number) => `who-am-i:${code}:notes:${round}`

export interface Notes {
  notes: Ref<Note[]>
  add(text: string): void
  /** Sets the answer, or clears it with undefined. */
  setAnswer(id: string, answer: Answer | undefined): void
  remove(id: string): void
}

/**
 * A player's private notes about their own card. They never leave this tab: stored per
 * tab (sessionStorage, like the seat), so they survive a reload but no one else sees them.
 * `key` is null while there is nothing to take notes about.
 */
export function useNotes(storage: KeyValueStorage, key: () => string | null): Notes {
  const notes = ref<Note[]>([])

  watch(
    key,
    (next, previous) => {
      // A finished round's notes are of no use any more.
      if (previous && previous !== next) storage.removeItem(previous)
      notes.value = (next && readJson<Note[]>(storage, next)) || []
    },
    { immediate: true },
  )

  function save(list: Note[]) {
    notes.value = list
    const k = key()
    if (k) writeJson(storage, k, list)
  }

  return {
    notes,
    add(text) {
      const t = clip(text, LIMITS.label)
      if (!t || !key() || notes.value.length >= MAX_NOTES) return
      save([...notes.value, { id: randomId(), text: t }])
    },
    setAnswer(id, answer) {
      save(
        notes.value.map((n) => {
          if (n.id !== id) return n
          const { answer: _answer, ...rest } = n
          return answer ? { ...rest, answer } : rest
        }),
      )
    },
    remove(id) {
      save(notes.value.filter((n) => n.id !== id))
    },
  }
}
