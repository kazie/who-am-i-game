import { isHttpUrl } from './protocol'

export const IMAGE_WIDTH = 600

export type ImageSource =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  /** A Wikipedia article; the lead image is looked up via the API. */
  | { kind: 'article'; lang: string; title: string }
  /** A file page, e.g. commons.wikimedia.org/wiki/File:X.jpg or an article's #/media/File:X.jpg. */
  | { kind: 'file'; site: string; file: string }
  /** Anything else that looks like a picture URL. */
  | { kind: 'direct'; url: string }

// The File namespace in the languages people are most likely to paste from.
const FILE_NS = '(?:File|Fil|Datei|Fichier|Archivo|Bestand|Plik|Image)'
const MEDIA_HASH = new RegExp(`^#/media/${FILE_NS}:(.+)$`, 'i')
const FILE_PAGE = new RegExp(`^${FILE_NS}:(.+)$`, 'i')

const WIKIPEDIA_HOST = /^([a-z][a-z0-9-]*)(?:\.m)?\.wikipedia\.org$/

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export function classifyImageUrl(input: string): ImageSource {
  const trimmed = input.trim()
  if (!trimmed) return { kind: 'empty' }

  if (!isHttpUrl(trimmed)) return { kind: 'invalid' }
  const url = new URL(trimmed)

  const host = url.hostname.toLowerCase()
  const wiki = WIKIPEDIA_HOST.exec(host)
  const isCommons = host === 'commons.wikimedia.org' || host === 'commons.m.wikimedia.org'

  if (wiki || isCommons) {
    const site = wiki ? `${wiki[1]}.wikipedia.org` : 'commons.wikimedia.org'
    // Clicking a picture on Wikipedia gives .../wiki/Article#/media/File:Name.jpg
    const media = MEDIA_HASH.exec(url.hash)
    if (media) return { kind: 'file', site, file: decode(media[1]!) }

    const page = url.pathname.startsWith('/wiki/')
      ? decode(url.pathname.slice('/wiki/'.length))
      : (url.searchParams.get('title') ?? '')
    if (!page) return { kind: 'invalid' }

    const file = FILE_PAGE.exec(page)
    if (file) return { kind: 'file', site, file: file[1]! }
    if (wiki) return { kind: 'article', lang: wiki[1]!, title: page }
    return { kind: 'invalid' }
  }

  return { kind: 'direct', url: url.toString() }
}

export function fileUrl(site: string, file: string, width = IMAGE_WIDTH) {
  // Special:FilePath on a Wikipedia also serves Commons files.
  return `https://${site}/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${width}`
}

/**
 * Turns whatever the player pasted into a direct image URL.
 * Resolves to undefined when there is no usable picture.
 */
export async function resolveImageUrl(
  input: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | undefined> {
  const source = classifyImageUrl(input)
  switch (source.kind) {
    case 'empty':
    case 'invalid':
      return undefined
    case 'direct':
      return source.url
    case 'file':
      return fileUrl(source.site, source.file)
    case 'article': {
      const api = new URL(`https://${source.lang}.wikipedia.org/w/api.php`)
      api.search = new URLSearchParams({
        action: 'query',
        prop: 'pageimages',
        piprop: 'thumbnail',
        pithumbsize: String(IMAGE_WIDTH),
        titles: source.title.replace(/_/g, ' '),
        redirects: '1',
        format: 'json',
        formatversion: '2',
        origin: '*',
      }).toString()
      try {
        const res = await fetchFn(api.toString())
        if (!res.ok) return undefined
        const body = (await res.json()) as {
          query?: { pages?: { thumbnail?: { source?: string } }[] }
        }
        return body.query?.pages?.[0]?.thumbnail?.source
      } catch {
        return undefined
      }
    }
  }
}
