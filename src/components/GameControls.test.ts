import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { finishedState, overState } from '../fixtures'
import GameControls from './GameControls.vue'

describe('GameControls', () => {
  it('starts the next-round form afresh every round', async () => {
    const wrapper = mount(GameControls, { props: { state: finishedState, meId: 'p1' } })
    await wrapper.find('input').setValue('Famous painters')

    await wrapper.setProps({ state: { ...finishedState, round: finishedState.round + 1 } })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('names the winner without decoration once the game is over', () => {
    const wrapper = mount(GameControls, {
      props: { state: overState, meId: 'p1' },
    })
    expect(wrapper.text()).toContain('Bob won!')
  })
})
