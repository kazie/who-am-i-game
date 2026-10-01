import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { bigCatsSteps } from '../example/bigCats'
import { withRouter } from '../testRouter'
import ExampleGame from './ExampleGame.vue'

describe('ExampleGame', () => {
  it('steps forward and back through the game', async () => {
    const wrapper = mount(ExampleGame, { ...withRouter(), props: { steps: bigCatsSteps } })
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
    const wrapper = mount(ExampleGame, {
      ...withRouter(),
      props: { steps: bigCatsSteps, start: dealt },
    })
    const eve = wrapper.findAll('button').find((b) => b.text() === 'Eve')!
    await eve.trigger('click')
    expect(wrapper.text()).toContain("📱 Eve's phone")
    // Eve's own card is hidden on Eve's phone.
    expect(wrapper.text()).toContain('Who am I?')
    wrapper.unmount()
  })

  it("is only a picture: buttons and links in the phone and TV don't do anything", async () => {
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const dealt = bigCatsSteps.findIndex((s) => s.state.phase === 'playing')
    const wrapper = mount(ExampleGame, {
      ...withRouter(),
      props: { steps: bigCatsSteps, start: dealt },
    })

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Copy link')!
      .trigger('click')
    expect(writeText).not.toHaveBeenCalled()

    const link = wrapper.find('a[href*="screen"]')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)

    // The walkthrough's own controls still work.
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Next'))!
      .trigger('click')
    expect(wrapper.text()).toContain(bigCatsSteps[dealt + 1]!.title)
    wrapper.unmount()
  })
})
