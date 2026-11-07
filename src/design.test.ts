// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sourceFiles, srcPath } from './testFiles'

/**
 * Checks for the rules in DESIGN.md that a machine can check, so the look doesn't drift.
 */
const sources = sourceFiles()
  .filter((f) => /\.(vue|ts|css)$/.test(f) && !f.endsWith('.test.ts'))
  .map((f) => ({ file: srcPath(f), source: readFileSync(f, 'utf8') }))

/** Everything that can put text on screen: components, views, game code, example narration. */
const shown = sources.filter((s) => !s.file.endsWith('.css'))
/** The only emoji on purpose: the background-tab title, where they help you spot the tab. */
const EMOJI_ALLOWED = ['game/useAlerts.ts']

/** All CSS: style.css, and the <style> blocks of components. */
const css = sources
  .filter((s) => !s.file.endsWith('.ts'))
  .map(({ file, source }) => ({
    file,
    css: file.endsWith('.css')
      ? source
      : [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n'),
  }))

describe('design rules', () => {
  it.each(shown.filter((s) => !EMOJI_ALLOWED.includes(s.file)).map((s) => [s.file, s.source]))(
    '%s uses no emoji as icons',
    (_, source) => {
      // Icons come from AppIcon.vue; words do the rest.
      expect(source.match(/\p{Extended_Pictographic}/gu) ?? []).toEqual([])
    },
  )

  it('only allows emoji in files that exist', () => {
    for (const file of EMOJI_ALLOWED) expect(shown.map((s) => s.file)).toContain(file)
  })

  it.each(css.map((c) => [c.file, c.css]))('%s uses only the two typefaces', (_, styles) => {
    // Set once in style.css as --font-text and --font-typed.
    expect(styles.match(/font-family:(?!\s*var\(--font-)[^;]*/g) ?? []).toEqual([])
  })

  it.each(css.map((c) => [c.file, c.css]))('%s has no glows or side stripes', (_, styles) => {
    // Only cards cast a shadow (--card-shadow); anything else is a glow by another name.
    const shadows = styles.match(/(?:box-shadow|text-shadow):[^;]*/g) ?? []
    expect(shadows.filter((s) => !/^box-shadow:\s*(?:var\(--card-shadow\)|none)$/.test(s))).toEqual(
      [],
    )
    expect(styles).not.toMatch(/drop-shadow|backdrop-filter|border-(?:left|inline-start)/)
  })
})
