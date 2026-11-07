// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SRC, sourceFiles } from './testFiles'

/**
 * histoire.css and the style.css scoping in histoire.config.ts hook into Histoire's own
 * markup, which is not a public API. If an upgrade renames a class or test id, the CSS just
 * stops matching: the previews go back to white, or the game's styles leak into Histoire or
 * vanish from the stories, with no error anywhere. So check every hook is still there.
 */
const fromHistoire = createRequire(createRequire(import.meta.url).resolve('histoire/package.json'))
const packageDir = (name: string) => dirname(fromHistoire.resolve(`${name}/package.json`))
const histoire = ['@histoire/app', '@histoire/controls']
  .flatMap((name) => sourceFiles(join(packageDir(name), 'dist')))
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const ours = ['histoire.css', '../histoire.config.ts']
  .map((f) => readFileSync(join(SRC, f), 'utf8'))
  .join('\n')
const hooks = [
  ...ours.matchAll(/\.((?:__)?histoire-[\w-]+|htw-[\w-]+)/g),
  ...ours.matchAll(/data-test-id='([\w-]+)'/g),
].map((m) => m[1]!)

describe('Histoire hooks', () => {
  it('uses some of Histoire’s markup', () => {
    expect(hooks.length).toBeGreaterThan(0)
  })

  it.each([...new Set(hooks)])('hooks into %s, which Histoire still has', (hook) => {
    expect(histoire).toContain(hook)
  })

  it('relies on previews starting with a transparent background', () => {
    // The 'Table' preset in histoire.config.ts is transparent, and histoire.css paints the
    // table under it, so new viewers see the table first.
    expect(histoire).toMatch(/backgroundColor: "transparent"/)
  })
})
