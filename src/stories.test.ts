// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every component and view must be imported by at least one *.story.vue, so new UI
 * shows up in Histoire.
 */
const SRC = import.meta.dirname

/** Each needs the real WebSocket bridge, and only wraps a component that has stories. */
const EXEMPT: Record<string, string> = {
  'views/RoomView.vue': 'thin wrapper around RoomScreen (see RoomScreen*.story.vue)',
  'views/ScreenView.vue': 'thin wrapper around ScreenBoard (see ScreenBoard.story.vue)',
}

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  )

const all = files(SRC)
const stories = all.filter((f) => f.endsWith('.story.vue')).map((f) => readFileSync(f, 'utf8'))
const ui = all
  .filter((f) => f.endsWith('.vue') && !f.endsWith('.story.vue'))
  .map((f) => relative(SRC, f))
  .filter((f) => f.startsWith('components/') || f.startsWith('views/'))

describe('stories', () => {
  it.each(ui.filter((f) => !(f in EXEMPT)))('%s has a story', (file) => {
    const name = file.split('/').pop()!
    const imported = stories.some((s) => new RegExp(`from '[./a-z]*/${name}'`).test(s))
    expect(imported, `no *.story.vue imports ${name}`).toBe(true)
  })

  it('only exempts files that exist', () => {
    for (const file of Object.keys(EXEMPT)) expect(ui).toContain(file)
  })
})
