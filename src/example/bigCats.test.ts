import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ScreenBoard from '../components/ScreenBoard.vue'
import * as fixtures from '../fixtures'
import type { GameState } from '../game/protocol'
import { isStateMessage } from '../game/protocol'
import { activePlayers, identityOf, winners } from '../game/reducer'
import { bigCatsEntries, bigCatsSteps } from './bigCats'

const last = bigCatsSteps[bigCatsSteps.length - 1]!
const stepNamed = (title: string) => bigCatsSteps.find((s) => s.title === title)!
const roundEnd = (round: number) =>
  bigCatsSteps.find((s) => s.state.phase === 'finished' && s.state.round === round)!.state

describe('the Big cats example', () => {
  it('every step, and every story fixture, is a state the game would accept', () => {
    const states: GameState[] = [
      ...bigCatsSteps.map((s) => s.state),
      ...Object.values(fixtures).filter((v): v is GameState => 'phase' in v),
    ]
    for (const state of states)
      expect(isStateMessage({ type: 'state', from: state.hostId, state })).toBe(true)
  })

  it('uses real Wikipedia pictures for every cat, in the game and the story fixtures', () => {
    const { noPicture: _none, ...withPictures } = fixtures.entries
    for (const e of [...Object.values(bigCatsEntries), ...Object.values(withPictures)]) {
      expect(e.imageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//)
      expect(e.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//)
    }
  })

  it('never deals anyone their own cat', () => {
    for (const { state } of bigCatsSteps)
      for (const p of activePlayers(state)) {
        const identity = identityOf(state, p.id)
        if (identity) expect(identity.author.id).not.toBe(p.id)
      }
  })

  it('round 1 pays the ladder 4, 3, 2, 1, 0 and both rounds add up', () => {
    expect(Object.values(roundEnd(1).roundScores).sort()).toEqual([0, 1, 2, 3, 4])
    const r2 = roundEnd(2)
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)
    expect(sum(r2.scores)).toBe(2 * 10)
  })

  it('ends over, with the narrated winner', () => {
    expect(last.state.phase).toBe('over')
    const names = winners(last.state).map((p) => p.name)
    expect(names.length).toBeGreaterThan(0)
    for (const n of names) expect(last.text).toContain(n)
  })

  it('the steps show what they say', () => {
    const wrong = stepNamed('Not quite')
    expect(Object.keys(wrong.state.roundScores)).toHaveLength(0)
    expect(wrong.state.players.every((p) => !p.solved)).toBe(true)
    const first = stepNamed('First correct guess: 4 points')
    expect(first.state.roundScores[first.focus]).toBe(4)
    const card = identityOf(first.state, first.focus)!.entry.label
    expect(first.text).toContain(card)
  })

  it('the presentation screen never shows an unsolved cat at any step', () => {
    for (const { state } of bigCatsSteps) {
      if (state.phase !== 'playing') continue
      const text = mount(ScreenBoard, { props: { state } }).text()
      for (const p of activePlayers(state)) {
        if (p.solved) continue
        const label = identityOf(state, p.id)!.entry.label
        // A solved player's card may carry the same name only if two people wrote it.
        const shownElsewhere = activePlayers(state).some(
          (q) => q.solved && identityOf(state, q.id)?.entry.label === label,
        )
        if (!shownElsewhere) expect(text).not.toContain(label)
      }
    }
  })
})
