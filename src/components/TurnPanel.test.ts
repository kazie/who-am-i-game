import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { playingState, votingState } from '../fixtures'
import TurnPanel from './TurnPanel.vue'

describe('TurnPanel', () => {
  it('tells the active player it is their turn', () => {
    const wrapper = mount(TurnPanel, { props: { state: playingState, meId: 'p3' } })
    expect(wrapper.text()).toContain('Your turn')
    expect(wrapper.text()).toContain('I want to guess')
  })

  it('shows the others the card being guessed and lets them vote', async () => {
    const wrapper = mount(TurnPanel, { props: { state: votingState, meId: 'p2' } })
    expect(wrapper.text()).toContain('Chen is guessing')
    const [correct, notQuite] = wrapper.findAll('[aria-label="Your vote"] button')
    expect(correct!.text()).toBe('Correct')
    expect(notQuite!.text()).toBe('Not quite')
    await notQuite!.trigger('click')
    expect(wrapper.emitted('vote')).toEqual([[false]])
  })

  it('marks the vote already given', () => {
    const wrapper = mount(TurnPanel, { props: { state: votingState, meId: 'p1' } })
    const [correct] = wrapper.findAll('[aria-label="Your vote"] button')
    expect(correct!.attributes('aria-pressed')).toBe('true')
  })

  it('announces turn changes and votes to screen readers', () => {
    const wrapper = mount(TurnPanel, { props: { state: votingState, meId: 'p2' } })
    const live = wrapper.find('[aria-live="polite"]').text()
    expect(live).toContain('Chen is guessing')
    expect(live).toContain('1 correct')
  })

  it('never reads out the card being guessed by itself', () => {
    // A screen reader speaking at the table would give the answer away.
    const wrapper = mount(TurnPanel, { props: { state: votingState, meId: 'p2' } })
    expect(wrapper.text()).toContain('Caracal')
    expect(wrapper.find('[aria-live="polite"]').text()).not.toContain('Caracal')
  })
})
