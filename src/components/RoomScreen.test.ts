import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { staticRoom } from '../example/staticRoom'
import { playingState, writingState } from '../fixtures'
import { memoryStorage } from '../game/storage'
import { RULES_KEY, useRules } from '../game/useRules'
import { withRouter } from '../testRouter'
import RoomScreen from './RoomScreen.vue'

describe('RoomScreen', () => {
  it('asks only for a name when the link has a valid code', () => {
    const wrapper = mount(RoomScreen, {
      ...withRouter(),
      props: { room: staticRoom(null, undefined, { code: 'CATS7' }) },
    })
    expect(wrapper.text()).toContain('Join room CATS7')
    expect(wrapper.findAll('input')).toHaveLength(1)
  })

  it("covers the others' cards until a first-time player has read why they're secret", async () => {
    const storage = memoryStorage()
    const wrapper = mount(RoomScreen, {
      ...withRouter(),
      props: { room: staticRoom(playingState, 'p1'), rules: useRules(storage) },
      attachTo: document.body,
    })
    // Alice would see Bob's Serval, Chen's Caracal and Dana's Lion.
    const cards = ['Serval', 'Caracal', 'Lion']
    for (const c of cards) expect(wrapper.text()).not.toContain(c)
    expect(wrapper.text()).toContain('Before you look')
    await wrapper.find('button.primary').trigger('click')
    for (const c of cards) expect(wrapper.text()).toContain(c)
    expect(wrapper.text()).toContain('Their cards: keep them secret')
    expect(storage.getItem(RULES_KEY)).toBe('yes')
    wrapper.unmount()
  })

  it('says the card you write is for someone else', () => {
    const wrapper = mount(RoomScreen, {
      ...withRouter(),
      props: { room: staticRoom(writingState, 'p2') },
    })
    expect(wrapper.text()).toContain('Write a card for someone else')
  })

  it('asks before you leave mid-round, since you give up your card', async () => {
    const wrapper = mount(RoomScreen, {
      ...withRouter(),
      props: { room: staticRoom(playingState, 'p3') },
    })
    await wrapper.find('button.leave').trigger('click')
    expect(wrapper.text()).toContain('Leaving now takes you out of this round')
    expect(wrapper.text()).toContain('Leave anyway')
  })

  it('tells a covered first-time player when the game waits for them', () => {
    const wrapper = mount(RoomScreen, {
      ...withRouter(),
      props: { room: staticRoom(playingState, 'p3'), rules: useRules(memoryStorage()) },
    })
    expect(wrapper.text()).toContain("It's your turn!")
    expect(wrapper.text()).not.toContain('Caracal')
  })
})
