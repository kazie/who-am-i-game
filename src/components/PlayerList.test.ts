import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { playingState, writingState } from '../fixtures'
import PlayerList from './PlayerList.vue'

describe('PlayerList', () => {
  it('marks the host, who can remove anyone else after confirming', async () => {
    const wrapper = mount(PlayerList, { props: { state: playingState, meId: 'p1' } })
    expect(wrapper.find('.host').text()).toContain('host')
    const removable = wrapper.findAll('button').map((b) => b.attributes('aria-label'))
    expect(removable).toEqual(['Remove Bob', 'Remove Chen', 'Remove Dana', 'Remove Eve'])

    await wrapper.find('button[aria-label="Remove Chen"]').trigger('click')
    expect(wrapper.text()).toContain('Remove Chen? The card Chen wrote stays on the table.')
    expect(wrapper.emitted('kick')).toBeUndefined()
    await wrapper.findAll('.confirm button')[0]!.trigger('click')
    expect(wrapper.emitted('kick')).toEqual([['p3']])
  })

  it('mid-round, lets everyone else remove only players who are watching', () => {
    // Dana is away, but her turns are passed over anyway: only the host removes her.
    const wrapper = mount(PlayerList, { props: { state: playingState, meId: 'p2' } })
    const removable = wrapper.findAll('button').map((b) => b.attributes('aria-label'))
    expect(removable).toEqual(['Remove Eve'])
  })

  it('drops a pending question once that player can no longer be removed', async () => {
    const away = { ...writingState, sentAt: writingState.sentAt + 1 }
    const wrapper = mount(PlayerList, { props: { state: away, meId: 'p2' } })
    await wrapper.find('button[aria-label="Remove Chen"]').trigger('click')
    expect(wrapper.text()).toContain('Remove Chen?')
    // Chen comes back, then goes away again: no question pops up by itself.
    const back = { ...away, players: away.players.map((p) => ({ ...p, lastSeen: away.sentAt })) }
    await wrapper.setProps({ state: back })
    await wrapper.setProps({ state: away })
    expect(wrapper.text()).not.toContain('Remove Chen?')
  })
})
