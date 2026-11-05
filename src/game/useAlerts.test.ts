import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'
import { lobbyState, playingState, votingState } from '../fixtures'
import type { GameState } from './protocol'
import { memoryStorage } from './storage'
import { attentionFor, MUTE_KEY, useAlerts, type AlertDeps } from './useAlerts'

// playingState: Chen's (p3) turn, Bob (p2) solved, Dana (p4) away, Eve (p5) watching.
// votingState: Chen is guessing and Alice (p1) already voted.

describe('attentionFor', () => {
  it('is my turn only when it is', () => {
    expect(attentionFor(playingState, 'p3')).toBe('turn')
    expect(attentionFor(playingState, 'p1')).toBeUndefined()
    expect(attentionFor(lobbyState, 'p1')).toBeUndefined()
    expect(attentionFor(null, 'p1')).toBeUndefined()
    expect(attentionFor(playingState, undefined)).toBeUndefined()
  })

  it('asks for my vote until I have voted, but never the guesser or a spectator', () => {
    expect(attentionFor(votingState, 'p2')).toBe('vote') // solved players vote too
    expect(attentionFor(votingState, 'p1')).toBeUndefined() // already voted
    expect(attentionFor(votingState, 'p3')).toBeUndefined() // the guesser
    expect(attentionFor(votingState, 'p5')).toBeUndefined() // spectator
  })
})

function setup(initial: GameState | null, meId: string, opts: Partial<AlertDeps> = {}) {
  const state = shallowRef<GameState | null>(initial)
  const doc = Object.assign(new EventTarget(), { hidden: false, title: 'Who Am I?' })
  const beep = vi.fn()
  const vibrate = vi.fn()
  const storage = opts.storage ?? memoryStorage()
  const scope = effectScope()
  const alerts = scope.run(() =>
    useAlerts(state, () => meId, { storage, document: doc, beep, vibrate, ...opts }),
  )!
  const show = async (s: GameState | null) => {
    state.value = s
    await nextTick()
  }
  const setHidden = (hidden: boolean) => {
    doc.hidden = hidden
    doc.dispatchEvent(new Event('visibilitychange'))
  }
  return { state, doc, beep, vibrate, storage, scope, alerts, show, setHidden }
}

const othersTurn = { ...playingState, turn: 'p1' }

describe('useAlerts', () => {
  it('beeps and vibrates once when my turn comes', async () => {
    const t = setup(othersTurn, 'p3')
    await t.show(playingState)
    expect(t.beep).toHaveBeenCalledWith('turn')
    expect(t.vibrate).toHaveBeenCalledWith([200])
    await t.show({ ...playingState, version: 99 }) // still my turn
    expect(t.beep).toHaveBeenCalledTimes(1)
  })

  it('asks for my vote', async () => {
    const t = setup(playingState, 'p2')
    await t.show(votingState)
    expect(t.beep).toHaveBeenCalledWith('vote')
  })

  it('stays quiet about the state a freshly opened tab finds', async () => {
    const t = setup(null, 'p3')
    await t.show(playingState)
    expect(t.beep).not.toHaveBeenCalled()
    const resumed = setup(playingState, 'p3')
    await resumed.show({ ...playingState, version: 99 })
    expect(resumed.beep).not.toHaveBeenCalled()
  })

  it('alerts after a first snapshot that needed nothing', async () => {
    const t = setup(null, 'p3')
    await t.show(othersTurn)
    await t.show(playingState)
    expect(t.beep).toHaveBeenCalledOnce()
  })

  it('mute silences sound and vibration, and is remembered', async () => {
    const t = setup(othersTurn, 'p3')
    t.alerts.toggle()
    await t.show(playingState)
    expect(t.beep).not.toHaveBeenCalled()
    expect(t.vibrate).not.toHaveBeenCalled()
    await nextTick()
    expect(t.storage.getItem(MUTE_KEY)).toBe('off')
    const later = setup(othersTurn, 'p3', { storage: t.storage })
    expect(later.alerts.muted.value).toBe(true)
    later.alerts.toggle()
    await nextTick()
    expect(t.storage.getItem(MUTE_KEY)).toBeNull()
  })

  it('puts it in the title while the tab is hidden, and takes it out again', async () => {
    const t = setup(othersTurn, 'p3')
    t.setHidden(true)
    await t.show(playingState)
    expect(t.doc.title).toBe('🎤 Your turn! · Who Am I?')
    t.setHidden(false)
    expect(t.doc.title).toBe('Who Am I?')
    t.setHidden(true) // still my turn: remind me again
    expect(t.doc.title).toBe('🎤 Your turn! · Who Am I?')
    await t.show(othersTurn)
    expect(t.doc.title).toBe('Who Am I?')
  })

  it('leaves the title as it found it', async () => {
    const t = setup(othersTurn, 'p3')
    t.setHidden(true)
    await t.show(playingState)
    t.scope.stop()
    expect(t.doc.title).toBe('Who Am I?')
  })
})
