import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { memoryStorage } from '../game/storage'
import { useNotes } from '../game/useNotes'
import NotesPanel from './NotesPanel.vue'

const setup = () => {
  const notes = useNotes(memoryStorage(), () => 'notes')
  return { notes, wrapper: mount(NotesPanel, { props: { notes } }) }
}

describe('NotesPanel', () => {
  it('adds notes and labels each answer button for screen readers', async () => {
    const { notes, wrapper } = setup()
    await wrapper.find('input').setValue('Am I an animal?')
    await wrapper.find('form').trigger('submit')

    const labels = wrapper.findAll('.answers button').map((b) => b.attributes('aria-label'))
    expect(labels).toEqual([
      'Am I an animal?: Yes',
      'Am I an animal?: No',
      'Am I an animal?: Not sure',
    ])
    await wrapper.find('.answers button').trigger('click')
    expect(notes.notes.value[0]?.answer).toBe('yes')
    expect(wrapper.find('.answers button').attributes('aria-pressed')).toBe('true')
  })

  it('adds a note with its answer in one tap, under that answer', async () => {
    const { notes, wrapper } = setup()
    await wrapper.find('input').setValue('Do I have stripes?')
    await wrapper.find('button[aria-label="Add as No"]').trigger('click')
    expect(notes.notes.value[0]).toMatchObject({ text: 'Do I have stripes?', answer: 'no' })
    expect(wrapper.find('section[aria-label="No"]').text()).toContain('Do I have stripes?')
  })

  it('opens a note to move, edit or remove it', async () => {
    const { notes, wrapper } = setup()
    notes.add('Animal', 'yes')
    notes.add('Africa', 'yes')
    await wrapper.vm.$nextTick()
    const africa = () => wrapper.findAll('.text')[1]!
    await africa().trigger('click')
    expect(africa().attributes('aria-expanded')).toBe('true')
    expect(
      wrapper.find('button[aria-label="Move Africa down"]').attributes('disabled'),
    ).toBeDefined()
    await wrapper.find('button[aria-label="Move Africa up"]').trigger('click')
    expect(notes.notes.value.map((n) => n.text)).toEqual(['Africa', 'Animal'])

    await wrapper.find('button[aria-label="Edit Africa"]').trigger('click')
    const input = wrapper.find('input[aria-label="Rewrite Africa"]')
    await input.setValue('Do I live in Africa?')
    await wrapper.find('form.edit').trigger('submit')
    expect(notes.notes.value[0]!.text).toBe('Do I live in Africa?')

    // Still open after the edit.
    await wrapper.find('button[aria-label="Remove Do I live in Africa?"]').trigger('click')
    expect(notes.notes.value.map((n) => n.text)).toEqual(['Animal'])
  })
})
