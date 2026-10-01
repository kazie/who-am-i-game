import { describe, expect, it, vi } from 'vitest'
import { classifyImageUrl, resolveImageUrl } from './wikipedia'

describe('classifyImageUrl', () => {
  it.each([
    ['', { kind: 'empty' }],
    ['not a url', { kind: 'invalid' }],
    ['ftp://example.com/a.jpg', { kind: 'invalid' }],
    [
      'https://en.wikipedia.org/wiki/Marie_Curie',
      { kind: 'article', lang: 'en', title: 'Marie_Curie' },
    ],
    ['https://sv.m.wikipedia.org/wiki/R%C3%A4v', { kind: 'article', lang: 'sv', title: 'Räv' }],
    [
      'https://en.wikipedia.org/wiki/Red_fox#/media/File:Fox_-_British_Wildlife_Centre_(17429406401).jpg',
      {
        kind: 'file',
        site: 'en.wikipedia.org',
        file: 'Fox_-_British_Wildlife_Centre_(17429406401).jpg',
      },
    ],
    [
      'https://de.wikipedia.org/wiki/Datei:Fuchs.jpg',
      { kind: 'file', site: 'de.wikipedia.org', file: 'Fuchs.jpg' },
    ],
    [
      'https://commons.wikimedia.org/wiki/File:Marie_Curie_c._1920s.jpg',
      { kind: 'file', site: 'commons.wikimedia.org', file: 'Marie_Curie_c._1920s.jpg' },
    ],
    [
      'https://upload.wikimedia.org/wikipedia/commons/7/7e/Marie_Curie_c._1920s.jpg',
      {
        kind: 'direct',
        url: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Marie_Curie_c._1920s.jpg',
      },
    ],
  ])('%s', (input, expected) => {
    expect(classifyImageUrl(input)).toEqual(expected)
  })
})

describe('resolveImageUrl', () => {
  it('looks up the lead image of an article', async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        query: { pages: [{ thumbnail: { source: 'https://upload.wikimedia.org/thumb.jpg' } }] },
      }),
    )
    const url = await resolveImageUrl('https://en.wikipedia.org/wiki/Marie_Curie', fetchFn)
    expect(url).toBe('https://upload.wikimedia.org/thumb.jpg')
    const called = new URL(String((fetchFn.mock.calls[0] as unknown[])[0]))
    expect(called.host).toBe('en.wikipedia.org')
    expect(called.searchParams.get('titles')).toBe('Marie Curie')
    expect(called.searchParams.get('origin')).toBe('*')
  })

  it('returns undefined when the article has no picture or the request fails', async () => {
    expect(
      await resolveImageUrl('https://en.wikipedia.org/wiki/X', async () =>
        Response.json({ query: { pages: [{}] } }),
      ),
    ).toBeUndefined()
    expect(
      await resolveImageUrl('https://en.wikipedia.org/wiki/X', async () => {
        throw new Error('offline')
      }),
    ).toBeUndefined()
  })

  it('turns file pages into FilePath URLs without fetching', async () => {
    const fetchFn = vi.fn()
    expect(await resolveImageUrl('https://commons.wikimedia.org/wiki/File:A b.jpg', fetchFn)).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/A_b.jpg?width=600',
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('passes direct image URLs through', async () => {
    expect(await resolveImageUrl('https://example.com/cat.png')).toBe('https://example.com/cat.png')
  })
})
