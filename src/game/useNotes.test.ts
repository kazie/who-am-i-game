import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import NotesPanel from '../components/NotesPanel.vue'
import { LIMITS } from './protocol'
import { memoryStorage } from './storage'
import { MAX_NOTES, notesKey, useNotes } from './useNotes'

function setup(storage = memoryStorage(), round = ref<number | null>(1)) {
  const scope = effectScope()
  const notes = scope.run(() =>
    useNotes(storage, () => (round.value === null ? null : notesKey('ABCDE', round.value))),
  )!
  return { notes, storage, round, scope }
}

const texts = (n: ReturnType<typeof setup>['notes']) => n.notes.value.map((x) => x.text)

describe('useNotes', () => {
  it('adds, answers, clears and removes notes', () => {
    const { notes } = setup()
    notes.add('  Am I an animal? ')
    notes.add('Do I have spots?')
    expect(texts(notes)).toEqual(['Am I an animal?', 'Do I have spots?'])
    const [animal, spots] = notes.notes.value
    notes.setAnswer(animal!.id, 'yes')
    notes.setAnswer(spots!.id, 'no')
    expect(notes.notes.value.map((n) => n.answer)).toEqual(['yes', 'no'])
    notes.setAnswer(animal!.id, undefined)
    expect(notes.notes.value[0]).not.toHaveProperty('answer')
    notes.remove(spots!.id)
    expect(texts(notes)).toEqual(['Am I an animal?'])
  })

  it('keeps the notes over a reload', () => {
    const first = setup()
    first.notes.add('Am I a cat?')
    first.scope.stop()
    const again = setup(first.storage)
    expect(texts(again.notes)).toEqual(['Am I a cat?'])
  })

  it('starts a clean list each round and forgets the old one', async () => {
    const { notes, storage, round } = setup()
    notes.add('Am I a cat?')
    round.value = 2
    await nextTick()
    expect(notes.notes.value).toEqual([])
    expect(storage.getItem(notesKey('ABCDE', 1))).toBeNull()
    notes.add('Am I a dog?')
    expect(storage.getItem(notesKey('ABCDE', 2))).toContain('Am I a dog?')
  })

  it('takes no notes without a round, ignores empty text and clips long text', () => {
    const none = setup(memoryStorage(), ref(null))
    none.notes.add('Lost?')
    expect(none.notes.notes.value).toEqual([])

    const { notes } = setup()
    notes.add('   ')
    expect(notes.notes.value).toEqual([])
    notes.add('x'.repeat(LIMITS.label + 20))
    expect(notes.notes.value[0]!.text).toHaveLength(LIMITS.label)
  })

  it(`stops at ${MAX_NOTES} notes`, () => {
    const { notes } = setup()
    for (let i = 0; i < MAX_NOTES + 5; i++) notes.add(`Note ${i}`)
    expect(notes.notes.value).toHaveLength(MAX_NOTES)
  })

  it('ignores broken saved notes', () => {
    const storage = memoryStorage()
    storage.setItem(notesKey('ABCDE', 1), '{not json')
    expect(setup(storage).notes.notes.value).toEqual([])
  })
})

describe('NotesPanel', () => {
  it('adds a note with Enter, and toggles its answer', async () => {
    const { notes } = setup()
    const panel = mount(NotesPanel, { props: { notes } })
    await panel.find('input').setValue('Am I an animal?')
    await panel.find('form').trigger('submit')
    expect(panel.text()).toContain('Am I an animal?')
    expect((panel.find('input').element as HTMLInputElement).value).toBe('')

    const yes = () => panel.find('button[title="Yes"]')
    await yes().trigger('click')
    expect(notes.notes.value[0]!.answer).toBe('yes')
    expect(yes().attributes('aria-pressed')).toBe('true')
    await yes().trigger('click')
    expect(notes.notes.value[0]!.answer).toBeUndefined()

    await panel.find('button[title="Remove"]').trigger('click')
    expect(notes.notes.value).toEqual([])
  })
})
