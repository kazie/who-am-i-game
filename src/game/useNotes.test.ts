import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import NotesPanel from '../components/NotesPanel.vue'
import { LIMITS } from './protocol'
import { memoryStorage } from './storage'
import { groupNotes, MAX_NOTES, notesKey, useNotes } from './useNotes'

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

  it('adds a note with its answer, and edits its text', () => {
    const { notes } = setup()
    notes.add('Am I an animal?', 'yes')
    expect(notes.notes.value[0]).toMatchObject({ text: 'Am I an animal?', answer: 'yes' })
    const id = notes.notes.value[0]!.id
    notes.edit(id, '  Am I a mammal? ')
    expect(texts(notes)).toEqual(['Am I a mammal?'])
    notes.edit(id, '   ')
    expect(texts(notes)).toEqual(['Am I a mammal?'])
  })

  it('groups by answer, yes first, each group in my own order', () => {
    const { notes } = setup()
    notes.add('Unsure', 'maybe')
    notes.add('Open')
    notes.add('Animal', 'yes')
    notes.add('Stripes', 'no')
    notes.add('Africa', 'yes')
    expect(
      groupNotes(notes.notes.value).map((g) => [g.answer, g.notes.map((n) => n.text)]),
    ).toEqual([
      ['yes', ['Animal', 'Africa']],
      ['no', ['Stripes']],
      ['maybe', ['Unsure']],
      [undefined, ['Open']],
    ])
  })

  it('keeps a saved note with an answer it does not know, as unanswered', () => {
    const storage = memoryStorage()
    const saved = [{ id: 'x', text: 'Old note', answer: 'perhaps' }, 'junk', { id: 'y' }]
    storage.setItem(notesKey('ABCDE', 1), JSON.stringify(saved))
    expect(setup(storage).notes.notes.value).toEqual([{ id: 'x', text: 'Old note' }])
    storage.setItem(notesKey('ABCDE', 1), JSON.stringify({ not: 'a list' }))
    expect(setup(storage).notes.notes.value).toEqual([])
  })

  it('moves a note up and down within its group only', () => {
    const { notes } = setup()
    notes.add('Animal', 'yes')
    notes.add('Stripes', 'no')
    notes.add('Africa', 'yes')
    const africa = notes.notes.value[2]!.id
    notes.move(africa, -1) // jumps over Stripes, which is in another group
    expect(texts(notes)).toEqual(['Africa', 'Stripes', 'Animal'])
    notes.move(africa, -1) // already first among the yeses
    expect(texts(notes)).toEqual(['Africa', 'Stripes', 'Animal'])
    notes.move(africa, 1)
    expect(texts(notes)).toEqual(['Animal', 'Stripes', 'Africa'])
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

    await panel.find('.text').trigger('click')
    await panel.find('button[aria-label="Remove Am I an animal?"]').trigger('click')
    expect(notes.notes.value).toEqual([])
  })
})
