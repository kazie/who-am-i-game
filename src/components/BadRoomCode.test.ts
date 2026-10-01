import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BadRoomCode from './BadRoomCode.vue'

describe('BadRoomCode', () => {
  it('explains the code and lets a player correct it', async () => {
    const wrapper = mount(BadRoomCode, { props: { code: 'ABCD0' } })
    expect(wrapper.text()).toContain("“ABCD0” isn't a valid room code")
    const [code, name] = wrapper.findAll('input')
    await code!.setValue('cats7')
    await name!.setValue('Zoe')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('join')?.[0]).toEqual([{ code: 'CATS7', name: 'Zoe' }])
  })

  it('asks a presentation screen only for a code', async () => {
    const wrapper = mount(BadRoomCode, { props: { code: 'CAT5', screen: true } })
    expect(wrapper.findAll('input')).toHaveLength(1)
    await wrapper.find('input').setValue('cats7')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('open')?.[0]).toEqual(['CATS7'])
  })
})
