import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { playingState } from '../fixtures'
import { memoryStorage } from '../game/storage'
import { useNotes } from '../game/useNotes'
import MyCard from './MyCard.vue'

const notes = () => {
  const n = useNotes(memoryStorage(), () => 'k')
  n.add('Am I an animal?', 'yes')
  return n
}

describe('MyCard', () => {
  it('shows my hidden card and my notes beside the cards', () => {
    const wrapper = mount(MyCard, { props: { state: playingState, meId: 'p3', notes: notes() } })
    expect(wrapper.text()).toContain('???')
    expect(wrapper.text()).toContain('Am I an animal?')
    // Chen has to guess Dana's Caracal: never on Chen's own screen.
    expect(wrapper.text()).not.toContain('Caracal')
  })

  it('docked, opens on a tap and closes with Escape', async () => {
    const wrapper = mount(MyCard, {
      props: { state: playingState, meId: 'p3', notes: notes(), docked: true },
    })
    const toggle = wrapper.find('button.toggle')
    expect(toggle.text()).toContain('My notes (1)')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    const shown = () => wrapper.find('.body').attributes('style') !== 'display: none;'
    expect(shown()).toBe(false)
    await toggle.trigger('click')
    expect(shown()).toBe(true)
    await wrapper.find('section').trigger('keydown', { key: 'Escape' })
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('shows the card once it is solved', () => {
    const wrapper = mount(MyCard, { props: { state: playingState, meId: 'p2', notes: notes() } })
    expect(wrapper.text()).toContain('Serval')
    expect(wrapper.text()).toContain('You got it!')
    expect(wrapper.text()).not.toContain('Am I an animal?')
  })
})
