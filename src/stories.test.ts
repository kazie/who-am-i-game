// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SRC, sourceFiles, srcPath } from './testFiles'

/**
 * Every component and view must be imported by at least one *.story.vue, so new UI shows up
 * in Histoire, and every story must see the preview's width rather than Histoire's window.
 * (That the game never imports story-only code is an ESLint rule: no-restricted-imports.)
 */

/** Each needs the real WebSocket bridge, and only wraps a component that has stories. */
const EXEMPT: Record<string, string> = {
  'views/RoomView.vue': 'thin wrapper around RoomScreen (see RoomScreen*.story.vue)',
  'views/ScreenView.vue': 'thin wrapper around ScreenBoard (see ScreenBoard.story.vue)',
}

/**
 * Stories render in Histoire's own page when they set `iframe: false`, and always in the
 * grid layout. There, media queries, matchMedia and vw see the whole Histoire window instead
 * of the preview, so anything that depends on them lays out for the wrong width.
 */
const NO_IFRAME: Record<string, string> = {
  'components/RoomScreen.story.vue': 'its seats share one in-memory game, which needs one page',
}

const all = sourceFiles()
const text = new Map(all.map((f) => [f, readFileSync(f, 'utf8')]))
const read = (file: string) => text.get(file)!
const stories = all.filter((f) => f.endsWith('.story.vue'))
const ui = all
  .filter((f) => f.endsWith('.vue') && !f.endsWith('.story.vue'))
  .map(srcPath)
  .filter((f) => f.startsWith('components/') || f.startsWith('views/'))

/** The classes style.css only styles inside a width or height media query. */
function sizedClasses(css: string): string[] {
  const classes: string[] = []
  for (const media of css.matchAll(/@media[^{]*\b(?:width|height)\b[^{]*\{/g)) {
    let depth = 1
    let end = media.index + media[0].length
    while (depth > 0) depth += { '{': 1, '}': -1 }[css[end++]!] ?? 0
    const block = css.slice(media.index, end)
    classes.push(...[...block.matchAll(/\.([\w-]+)/g)].map((m) => m[1]!))
  }
  return classes
}

/** Code that depends on the window's size: viewport units, size media queries, matchMedia. */
const VIEWPORT = new RegExp(
  [
    String.raw`\d(?:vw|vh|vmin|vmax|dvh|svh|lvh)\b`,
    String.raw`@media[^{]*\b(?:width|height)\b`,
    'matchMedia',
    ...sizedClasses(read(resolve(SRC, 'style.css'))).map((c) => String.raw`\b${c}\b`),
  ].join('|'),
)

/** `file` and every source file it imports, directly or not. */
function imports(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen
  seen.add(file)
  for (const [, spec] of read(file).matchAll(/from '(\.{1,2}\/[^']+)'/g)) {
    const target = resolve(dirname(file), spec!)
    const found = [target, `${target}.ts`].find((f) => text.has(f))
    if (found) imports(found, seen)
  }
  return seen
}

describe('stories', () => {
  it.each(ui.filter((f) => !(f in EXEMPT)))('%s has a story', (file) => {
    const name = file.split('/').pop()!
    const imported = stories.some((s) => new RegExp(`from '[./a-z]*/${name}'`).test(read(s)))
    expect(imported, `no *.story.vue imports ${name}`).toBe(true)
  })

  it('only exempts files that exist', () => {
    for (const file of Object.keys(EXEMPT)) expect(ui).toContain(file)
  })

  it.each(stories.filter((f) => !(srcPath(f) in NO_IFRAME)).map((f) => [srcPath(f), f]))(
    '%s sees the preview width',
    (_, file) => {
      const source = read(file)
      expect(source, 'iframe: false makes media queries see the Histoire window').not.toMatch(
        /iframe\s*:\s*false/,
      )
      if (!/type\s*:\s*'grid'/.test(source)) return
      // A grid has no iframe: only UI that ignores the window's size can go in one.
      const sized = [...imports(file)].filter((f) => VIEWPORT.test(read(f))).map(srcPath)
      expect(sized, 'these depend on the window size: use the single layout').toEqual([])
    },
  )

  it('only lets stories skip the iframe while they need to', () => {
    for (const name of Object.keys(NO_IFRAME)) {
      const file = stories.find((f) => srcPath(f) === name)
      expect(file, `${name} does not exist`).toBeDefined()
      expect(read(file!), `${name} has an iframe again`).toMatch(/iframe\s*:\s*false/)
    }
  })
})
