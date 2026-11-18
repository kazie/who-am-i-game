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

  it("names the asking player's card, so you can answer without looking for it", () => {
    // Alice sees Chen asking; Chen has to guess Dana's Caracal.
    const wrapper = mount(TurnPanel, { props: { state: playingState, meId: 'p1' } })
    expect(wrapper.text()).toContain('Chen is asking')
    expect(wrapper.text()).toContain("Chen's card: Caracal")
    expect(wrapper.find('[aria-live="polite"]').text()).not.toContain('Caracal')
    // Never your own.
    expect(mount(TurnPanel, { props: { state: playingState, meId: 'p3' } }).text()).not.toContain(
      'Caracal',
    )
  })

  it('asks before skipping, and says when a guess would be dropped', async () => {
    const wrapper = mount(TurnPanel, { props: { state: votingState, meId: 'p1' } })
    await wrapper.find('button.skip').trigger('click')
    expect(wrapper.emitted('pass')).toBeUndefined()
    expect(wrapper.text()).toContain("Skip Chen's turn? Their guess and its votes are dropped.")
    await wrapper.findAll('.skip button')[0]!.trigger('click')
    expect(wrapper.emitted('pass')).toHaveLength(1)
  })

  it('drops a pending skip question once the skip is no longer possible', async () => {
    const away = { ...playingState, turn: 'p4' } // Dana is away
    const wrapper = mount(TurnPanel, { props: { state: away, meId: 'p2' } })
    await wrapper.find('button.skip').trigger('click')
    expect(wrapper.text()).toContain('Yes, skip')
    const back = { ...away, players: away.players.map((p) => ({ ...p, lastSeen: away.sentAt })) }
    await wrapper.setProps({ state: back })
    await wrapper.setProps({ state: away })
    expect(wrapper.text()).not.toContain('Yes, skip')
  })

  it('lets the host skip anyone, everyone else only an away player', () => {
    const host = mount(TurnPanel, { props: { state: playingState, meId: 'p1' } })
    expect(host.find('button.skip').text()).toBe("Skip Chen's turn")
    const bob = mount(TurnPanel, { props: { state: playingState, meId: 'p2' } })
    expect(bob.find('button.skip').exists()).toBe(false)
    const danaUp = mount(TurnPanel, {
      props: { state: { ...playingState, turn: 'p4' }, meId: 'p2' },
    })
    expect(danaUp.find('button.skip').text()).toBe('Dana is away: skip their turn')
  })

  it('never reads out the card being guessed by itself', () => {
    // A screen reader speaking at the table would give the answer away.
    const wrapper = mount(TurnPanel, { props: { state: votingState, meId: 'p2' } })
    expect(wrapper.text()).toContain('Caracal')
    expect(wrapper.find('[aria-live="polite"]').text()).not.toContain('Caracal')
  })
})
