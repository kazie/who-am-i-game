import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { entries, finishedState, overState, playingState, votingState } from '../fixtures'
import ScreenBoard from './ScreenBoard.vue'

// In playingState only Bob (p2) has solved; Bob had the Serval. Alice has the Tiger,
// Chen has the Caracal and Dana the Lion, and the screen is in front of all of them.
const secret = [entries.tiger.label, entries.caracal.label, entries.lion.label]

const text = (state: typeof playingState) => mount(ScreenBoard, { props: { state } }).text()

describe('ScreenBoard', () => {
  it('shows whose turn it is and solved cards, but never an unsolved one', () => {
    const t = text(playingState)
    expect(t).toContain("Chen's turn")
    expect(t).toContain(entries.serval.label)
    for (const label of secret) expect(t).not.toContain(label)
  })

  it('shows the live vote but not the answer being voted on', () => {
    const t = text(votingState)
    expect(t).toContain('Chen is guessing')
    expect(t).toMatch(/✅ 1\s+❌ 0/)
    for (const label of secret) expect(t).not.toContain(label)
  })

  it('reveals every card once the round is over', () => {
    const t = text(finishedState)
    for (const label of secret) expect(t).toContain(label)
  })

  it('names the winner when the game is over', () => {
    expect(text(overState)).toContain('🏆 Bob')
  })

  it('shows round, theme and points', () => {
    const t = text(playingState)
    expect(t).toContain('Round 2')
    expect(t).toContain('Big cats')
    expect(t).toContain('+3') // Bob, this round
  })
})
