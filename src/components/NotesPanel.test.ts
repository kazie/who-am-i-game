import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { memoryStorage } from '../game/storage'
import { useNotes } from '../game/useNotes'
import NotesPanel from './NotesPanel.vue'

describe('NotesPanel', () => {
  it('adds notes and labels each answer button for screen readers', async () => {
    const notes = useNotes(memoryStorage(), () => 'notes')
    const wrapper = mount(NotesPanel, { props: { notes } })
    await wrapper.find('input').setValue('Am I an animal?')
    await wrapper.find('form').trigger('submit')

    const labels = wrapper.findAll('.answers button').map((b) => b.attributes('aria-label'))
    expect(labels).toEqual([
      'Am I an animal?: Yes',
      'Am I an animal?: No',
      'Am I an animal?: Not sure',
      'Remove Am I an animal?',
    ])
    await wrapper.find('.answers button').trigger('click')
    expect(notes.notes.value[0]?.answer).toBe('yes')
    expect(wrapper.find('.answers button').attributes('aria-pressed')).toBe('true')
  })
})
