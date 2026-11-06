import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LIMITS } from '../game/protocol'
import EntryForm from './EntryForm.vue'

describe('EntryForm', () => {
  afterEach(() => vi.useRealTimers())

  /** Fills in the form; `answer` is the looked-up picture, an Error for a failed lookup. */
  async function fill(answer: string | undefined | Error | (() => string)) {
    vi.useFakeTimers()
    const resolve = async () => {
      if (answer instanceof Error) throw answer
      return typeof answer === 'function' ? answer() : answer
    }
    const wrapper = mount(EntryForm, { props: { theme: 'Animals', resolve, debounceMs: 10 } })
    await wrapper.find('input[placeholder^="e.g."]').setValue('Red fox')
    await wrapper.find('input[type="url"]').setValue('https://en.wikipedia.org/wiki/Red_fox')
    await vi.advanceTimersByTimeAsync(20)
    return wrapper
  }

  it('waits for the picture to load, then sends it with the entry', async () => {
    const wrapper = await fill('https://upload.wikimedia.org/fox.jpg')
    const send = wrapper.find('button[type="submit"]')
    expect(send.attributes('disabled')).toBeDefined()

    await wrapper.find('img').trigger('load')
    expect(send.attributes('disabled')).toBeUndefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      label: 'Red fox',
      imageUrl: 'https://upload.wikimedia.org/fox.jpg',
      sourceUrl: 'https://en.wikipedia.org/wiki/Red_fox',
    })
  })

  it('treats a picture that does not load as no picture', async () => {
    const wrapper = await fill('https://example.com/not-an-image.html')
    await wrapper.find('img').trigger('error')
    expect(wrapper.text()).toContain("didn't load as a picture")

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('No picture yet')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({ label: 'Red fox' })
  })

  it('can try a picture that failed to load again', async () => {
    const wrapper = await fill('https://upload.wikimedia.org/fox.jpg')
    await wrapper.find('img').trigger('error')
    await wrapper.find('button.chip').trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    await wrapper.find('img').trigger('load')
    expect(wrapper.text()).not.toContain("didn't load")
  })

  it('ignores a late error from a picture that has been replaced', async () => {
    let url = 'https://example.com/old.jpg'
    const wrapper = await fill(() => url)
    const old = wrapper.find('img').element

    url = 'https://example.com/new.jpg'
    await wrapper.find('input[type="url"]').setValue('https://example.com/new.jpg')
    await vi.advanceTimersByTimeAsync(20)
    old.setAttribute('src', 'https://example.com/old.jpg') // as if the old request answered late
    old.dispatchEvent(new Event('error'))
    await wrapper.find('img').trigger('load')

    expect(wrapper.text()).not.toContain("didn't load")
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      imageUrl: 'https://example.com/new.jpg',
    })
  })

  it('says when Wikipedia could not be reached, not that the article has no picture', async () => {
    const wrapper = await fill(new Error('offline'))
    expect(wrapper.text()).toContain("Couldn't reach Wikipedia")
    expect(wrapper.text()).not.toContain('has no picture')
  })

  it('can look the picture up again once the connection is back', async () => {
    let online = false
    const wrapper = await fill(() => {
      if (!online) throw new Error('offline')
      return 'https://upload.wikimedia.org/fox.jpg'
    })

    online = true
    await wrapper.find('button.chip').trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(wrapper.find('img').attributes('src')).toBe('https://upload.wikimedia.org/fox.jpg')
    await wrapper.find('img').trigger('load')
    expect(wrapper.text()).toContain('using its main picture')
  })

  it('refuses a picture link the relay would reject, and says why', async () => {
    const wrapper = await fill(`https://upload.wikimedia.org/${'x'.repeat(LIMITS.url)}.jpg`)
    expect(wrapper.text()).toContain('too long')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
