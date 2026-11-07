// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { movedStoryLink, SPLIT_INTO, storyId } from './storyLinks'
import { SRC } from './testFiles'

const OLD = storyId('RoomScreen.states')
const link = (name: string, n: number) => `#/story/${storyId(name)}?variantId=${storyId(name)}-${n}`

describe('moved story links', () => {
  it('sends an old variant to where it moved', () => {
    // "Playing, my turn" and "Banner: relay switched".
    expect(movedStoryLink(`#/story/${OLD}?variantId=${OLD}-14`)).toBe(link('RoomScreen.playing', 0))
    expect(movedStoryLink(`#/story/${OLD}?variantId=${OLD}-26`)).toBe(
      link('RoomScreen.connection', 2),
    )
  })

  it('sends the old story itself to its first variant', () => {
    expect(movedStoryLink(`#/story/${OLD}`)).toBe(link('RoomScreen.joining', 0))
    expect(movedStoryLink(`#/story/${OLD}?variantId=${OLD}-99`)).toBe(link('RoomScreen.joining', 0))
  })

  it('leaves every other link alone', () => {
    expect(movedStoryLink('')).toBeUndefined()
    expect(movedStoryLink(`#/story/${storyId('RoomScreen')}`)).toBeUndefined()
    expect(movedStoryLink(link('RoomScreen.playing', 3))).toBeUndefined()
  })

  it('moves each of the 27 old variants, and the new files hold exactly those', () => {
    const olds = Object.values(SPLIT_INTO).flat()
    expect([...olds].sort((a, b) => a - b)).toEqual([...Array(27).keys()])
    for (const [name, list] of Object.entries(SPLIT_INTO)) {
      const source = readFileSync(join(SRC, 'components', `${name}.story.vue`), 'utf8')
      expect(source.match(/\bvariant\(/g), name).toHaveLength(list.length)
    }
  })
})
