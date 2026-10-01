import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { withRouter } from '../testRouter'
import ScreenView from './ScreenView.vue'

describe('ScreenView', () => {
  // Valid codes would open the real bridge; these never get that far.
  it.each(['-', '!!', 'ABCD0'])('explains an invalid code "%s" instead of crashing', (code) => {
    const wrapper = mount(ScreenView, { ...withRouter(), props: { code } })
    expect(wrapper.text()).toContain("isn't a valid room code")
  })
})
