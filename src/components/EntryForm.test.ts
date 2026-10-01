import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LIMITS } from '../game/protocol'
import EntryForm from './EntryForm.vue'

describe('EntryForm', () => {
  afterEach(() => vi.useRealTimers())

  async function fill(resolvedUrl: string | undefined) {
    vi.useFakeTimers()
    const wrapper = mount(EntryForm, {
      props: { theme: 'Animals', resolve: async () => resolvedUrl, debounceMs: 10 },
    })
    await wrapper.find('input[placeholder^="e.g."]').setValue('Red fox')
    await wrapper.find('input[type="url"]').setValue('https://en.wikipedia.org/wiki/Red_fox')
    await vi.advanceTimersByTimeAsync(20)
    return wrapper
  }

  it('sends the entry with its resolved picture', async () => {
    const wrapper = await fill('https://upload.wikimedia.org/fox.jpg')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      label: 'Red fox',
      imageUrl: 'https://upload.wikimedia.org/fox.jpg',
      sourceUrl: 'https://en.wikipedia.org/wiki/Red_fox',
    })
  })

  it('refuses a picture link the relay would reject, and says why', async () => {
    const wrapper = await fill(`https://upload.wikimedia.org/${'x'.repeat(LIMITS.url)}.jpg`)
    expect(wrapper.text()).toContain('too long')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
