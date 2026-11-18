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
  /** In the player's own order; `groupNotes` sorts them by answer for showing. */
  notes: Ref<Note[]>
  add(text: string, answer?: Answer): void
  /** Rewrites a note; empty text leaves it as it was. */
  edit(id: string, text: string): void
  /** Sets the answer, or clears it with undefined. */
  setAnswer(id: string, answer: Answer | undefined): void
  /** Moves a note up (-1) or down (1) among the notes with the same answer. */
  move(id: string, by: -1 | 1): void
  remove(id: string): void
}

/** How notes are grouped on screen: what you know first. */
const ANSWER_ORDER = ['yes', 'no', 'maybe', undefined] as const

interface NoteGroup {
  answer: Answer | undefined
  notes: Note[]
}

/** The notes by answer (yes, no, not sure, none yet), each group in the player's order. */
export function groupNotes(notes: readonly Note[]): NoteGroup[] {
  return ANSWER_ORDER.map((answer) => ({
    answer,
    notes: notes.filter((n) => n.answer === answer),
  })).filter((g) => g.notes.length > 0)
}

const ANSWERS: readonly unknown[] = ['yes', 'no', 'maybe']

/**
 * Saved notes as this version shows them: a list of notes with text, and an answer it
 * knows or none (an unknown one is dropped, the note kept). Anything else starts afresh.
 */
function loadNotes(saved: unknown): Note[] {
  if (!Array.isArray(saved)) return []
  return saved
    .filter(
      (n): n is Note =>
        typeof n === 'object' &&
        n !== null &&
        typeof n.id === 'string' &&
        typeof n.text === 'string',
    )
    .map(({ id, text, answer }) => (ANSWERS.includes(answer) ? { id, text, answer } : { id, text }))
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
      notes.value = next ? loadNotes(readJson<unknown>(storage, next)) : []
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
    add(text, answer) {
      const t = clip(text, LIMITS.label)
      if (!t || !key() || notes.value.length >= MAX_NOTES) return
      save([...notes.value, { id: randomId(), text: t, ...(answer ? { answer } : {}) }])
    },
    edit(id, text) {
      const t = clip(text, LIMITS.label)
      if (t) save(notes.value.map((n) => (n.id === id ? { ...n, text: t } : n)))
    },
    move(id, by) {
      const list = notes.value
      const from = list.findIndex((n) => n.id === id)
      if (from < 0) return
      const answer = list[from]!.answer
      // The nearest note in the same group, in that direction.
      let to = from + by
      while (to >= 0 && to < list.length && list[to]!.answer !== answer) to += by
      if (to < 0 || to >= list.length) return
      const next = [...list]
      ;[next[from], next[to]] = [next[to]!, next[from]!]
      save(next)
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
