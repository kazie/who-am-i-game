import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { exampleJoinUrl as url } from '../fixtures'
import JoinQr from './JoinQr.vue'
import { qrModules } from './qr'

describe('JoinQr', () => {
  it('draws every dark module of the QR code for the url, on white', () => {
    const wrapper = mount(JoinQr, { props: { url } })
    const dark = qrModules(url).flat().filter(Boolean).length
    const drawn = wrapper.find('path').attributes('d')!.match(/M/g)!.length
    expect(drawn).toBe(dark)
    expect(wrapper.find('rect').attributes('fill')).toBe('#fff')
  })
})
