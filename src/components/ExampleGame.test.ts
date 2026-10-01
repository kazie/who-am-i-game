import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { bigCatsSteps } from '../example/bigCats'
import ExampleGame from './ExampleGame.vue'

describe('ExampleGame', () => {
  it('steps forward and back through the game', async () => {
    const wrapper = mount(ExampleGame, { props: { steps: bigCatsSteps } })
    expect(wrapper.text()).toContain(bigCatsSteps[0]!.title)
    expect(wrapper.text()).toContain(`Step 1 of ${bigCatsSteps.length}`)
    const next = wrapper.findAll('button').find((b) => b.text().includes('Next'))!
    await next.trigger('click')
    expect(wrapper.text()).toContain(bigCatsSteps[1]!.title)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain(bigCatsSteps[0]!.title)
    wrapper.unmount()
  })

  it("can show any player's phone at a step", async () => {
    const dealt = bigCatsSteps.findIndex((s) => s.state.phase === 'playing')
    const wrapper = mount(ExampleGame, { props: { steps: bigCatsSteps, start: dealt } })
    const eve = wrapper.findAll('button').find((b) => b.text() === 'Eve')!
    await eve.trigger('click')
    expect(wrapper.text()).toContain("📱 Eve's phone")
    // Eve's own card is hidden on Eve's phone.
    expect(wrapper.text()).toContain('Who am I?')
    wrapper.unmount()
  })
})
