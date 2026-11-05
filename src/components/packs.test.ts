import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { finishedState, packPlayingState } from '../fixtures'
import { packById } from '../game/packs'
import { roundEnded } from '../game/reducer'
import GameBoard from './GameBoard.vue'
import GameControls from './GameControls.vue'
import ThemeForm from './ThemeForm.vue'

describe('choosing a pack', () => {
  it('creates a room with a pack, without asking for a theme', async () => {
    const form = mount(ThemeForm)
    await form.find('select').setValue('landmarks')
    expect(form.find('input[placeholder^="e.g."]').exists()).toBe(false)
    await form.find('input[autocomplete="nickname"]').setValue('Alice')
    await form.find('form').trigger('submit')
    expect(form.emitted('create')).toEqual([[{ theme: '', name: 'Alice', pack: 'landmarks' }]])
  })

  it('creates a room where everyone writes, by default', async () => {
    const form = mount(ThemeForm)
    await form.find('input[placeholder^="e.g."]').setValue('Birds')
    await form.find('input[autocomplete="nickname"]').setValue('Alice')
    await form.find('form').trigger('submit')
    expect(form.emitted('create')).toEqual([[{ theme: 'Birds', name: 'Alice' }]])
  })

  it('can switch the next round to a pack', async () => {
    const controls = mount(GameControls, { props: { state: finishedState, meId: 'p1' } })
    await controls.find('select').setValue('animals')
    await controls.find('form').trigger('submit')
    expect(controls.emitted('newRound')).toEqual([['', 'animals']])
  })
})

describe('a pack round', () => {
  it('deals pack cards and names no author', () => {
    const labels = packById('big-cats')!.entries.map((e) => e.label)
    expect(roundEnded(packPlayingState)).toBe(false)
    for (const p of packPlayingState.players) expect(labels).toContain(p.entry?.label)
    const board = mount(GameBoard, { props: { state: packPlayingState, meId: 'p2' } }).text()
    expect(board).not.toContain('Written by')
  })
})
