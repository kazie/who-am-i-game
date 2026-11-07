/**
 * Story links that moved. Histoire makes story ids from file paths, and the published
 * stories get linked to, so when a story file is split or renamed its old links are sent on
 * here (histoire.setup.ts) instead of landing on an empty page.
 */

/** Histoire's id for `src/components/<name>.story.vue`. */
export const storyId = (name: string) =>
  `src-components-${name.toLowerCase().replaceAll('.', '-')}-story-vue`

/** RoomScreen.states.story.vue was split by phase. */
const SPLIT = storyId('RoomScreen.states')

/** Each new file's variants, in order, by their index in the old file. */
export const SPLIT_INTO: Record<string, number[]> = {
  'RoomScreen.joining': [0, 1, 2, 3, 4, 5, 6],
  'RoomScreen.lobby': [7, 8, 9, 10, 12, 13],
  'RoomScreen.playing': [14, 15, 16, 17, 11, 18, 19, 20, 21, 22, 23],
  'RoomScreen.connection': [24, 25, 26],
}

/** Where an old story link (`#/story/<id>?variantId=<id>-<n>`) went, if it moved. */
export function movedStoryLink(hash: string): string | undefined {
  const match = /^#\/story\/([\w-]+)(?:\?(.*))?$/.exec(hash)
  if (match?.[1] !== SPLIT) return undefined
  const params = new URLSearchParams(match[2] ?? '')
  const old = Number(params.get('variantId')?.slice(SPLIT.length + 1) ?? 0)
  const [name, index] = Object.entries(SPLIT_INTO)
    .map(([name, olds]) => [name, olds.indexOf(old)] as const)
    .find(([, index]) => index >= 0) ?? ['RoomScreen.joining', 0]
  params.set('variantId', `${storyId(name)}-${index}`)
  return `#/story/${storyId(name)}?${params}`
}
