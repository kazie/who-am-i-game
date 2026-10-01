import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { staticRoom } from '../example/staticRoom'
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
})
