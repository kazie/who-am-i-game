import { describe, expect, it } from 'vitest'
import type { ClientMessage, GameState } from './protocol'
import { isClientMessage, isStateMessage } from './protocol'
import {
  AWAY_AFTER_MS,
  canStartPlaying,
  createRoom,
  endTally,
  identityOf,
  isAway,
  reduce,
  can,
  finishTally,
  standings,
  tally,
  winners,
} from './reducer'

const now = 1000
// rng 0 makes the shuffle h->b, b->c, c->h and gives h the first turn.
const at = (t: number) => ({ now: t, rng: () => 0 })
const room = () =>
  createRoom({ code: 'ABCDE', theme: ' Animals ', hostId: 'h', hostName: 'Host', now })
const run = (s: GameState, ...actions: ClientMessage[]) =>
  actions.reduce((acc, a) => reduce(acc, a, at(now)), s)
const withBob = () => run(room(), { type: 'hello', from: 'b', name: 'Bob' })

/** Three players h, b, c in the playing phase, h's turn. */
function playing(): GameState {
  return run(
    room(),
    { type: 'hello', from: 'b', name: 'Bob' },
    { type: 'hello', from: 'c', name: 'Chen' },
    { type: 'startWriting', from: 'b' },
    { type: 'submit', from: 'h', entry: { label: 'Cat' } },
    { type: 'submit', from: 'b', entry: { label: 'Dog' } },
    { type: 'submit', from: 'c', entry: { label: 'Owl' } },
    { type: 'deal', from: 'c' },
  )
}

describe('lobby and writing', () => {
  it('creates a lobby with the creator as first player', () => {
    const s = room()
    expect(s).toMatchObject({ theme: 'Animals', phase: 'lobby', endVotes: [], kicked: [] })
    expect(s.players.map((p) => p.id)).toEqual(['h'])
  })

  it('adds players on hello and bumps the version', () => {
    const s = withBob()
    expect(s.players.map((p) => p.name)).toEqual(['Host', 'Bob'])
    expect(s.version).toBe(2)
  })

  it('returns the same object when nothing changes', () => {
    const s = room()
    expect(reduce(s, { type: 'ping', from: 'nobody' }, at(now))).toBe(s)
    expect(reduce(s, { type: 'startWriting', from: 'h' }, at(now))).toBe(s) // only one player
    expect(reduce(s, { type: 'submit', from: 'h', entry: { label: 'x' } }, at(now))).toBe(s) // lobby
  })

  it('updates lastSeen on repeated hello without duplicating', () => {
    const s = reduce(withBob(), { type: 'hello', from: 'b', name: 'Bobby' }, at(5000))
    expect(s.players).toHaveLength(2)
    expect(s.players[1]).toMatchObject({ name: 'Bob', lastSeen: 5000 })
  })

  it('lets any player start, but not strangers', () => {
    expect(run(withBob(), { type: 'startWriting', from: 'x' }).phase).toBe('lobby')
    expect(run(withBob(), { type: 'startWriting', from: 'b' }).phase).toBe('writing')
  })

  it('accepts exactly one entry per player', () => {
    const s = run(
      withBob(),
      { type: 'startWriting', from: 'h' },
      { type: 'submit', from: 'b', entry: { label: ' Dog ' } },
    )
    expect(reduce(s, { type: 'submit', from: 'b', entry: { label: 'Cat' } }, at(now))).toBe(s)
    expect(s.players[1]!.entry).toEqual({ label: 'Dog' })
  })

  it('requires all entries before dealing, and deals a derangement', () => {
    let s = run(
      withBob(),
      { type: 'startWriting', from: 'h' },
      { type: 'submit', from: 'h', entry: { label: 'Cat' } },
    )
    expect(canStartPlaying(s)).toBe(false)
    expect(run(s, { type: 'deal', from: 'h' })).toBe(s)
    s = run(s, { type: 'submit', from: 'b', entry: { label: 'Dog' } })
    expect(run(s, { type: 'deal', from: 'stranger' })).toBe(s)
    const p = run(s, { type: 'deal', from: 'b' })
    expect(p).toMatchObject({ phase: 'playing', turn: 'h' })
    expect(identityOf(p, 'h')?.entry.label).toBe('Dog')
    expect(identityOf(p, 'h')?.author.name).toBe('Bob')
  })

  it('lets players leave before the deal and between rounds, but not mid-round', () => {
    const writing = run(
      room(),
      { type: 'hello', from: 'b', name: 'Bob' },
      { type: 'hello', from: 'c', name: 'Chen' },
      { type: 'startWriting', from: 'h' },
    )
    expect(run(writing, { type: 'leave', from: 'c' }).players.map((p) => p.id)).toEqual(['h', 'b'])
    const s = playing()
    expect(run(s, { type: 'leave', from: 'c' })).toBe(s)
    const between = run(
      s,
      { type: 'endVote', from: 'h', end: true },
      { type: 'endVote', from: 'b', end: true },
    )
    expect(run(between, { type: 'leave', from: 'c' }).players).toHaveLength(2)
  })

  it('lets newcomers write while entries are open', () => {
    let s = run(withBob(), { type: 'startWriting', from: 'h' })
    s = run(s, { type: 'hello', from: 'c', name: 'Chen' })
    expect(s.players[2]!.spectator).toBe(false)
    s = run(s, { type: 'submit', from: 'c', entry: { label: 'Owl' } })
    expect(s.players[2]!.entry?.label).toBe('Owl')
  })

  it('makes players who join after the deal spectators who cannot act', () => {
    for (const s0 of [
      playing(),
      run(
        playing(),
        { type: 'endVote', from: 'h', end: true },
        { type: 'endVote', from: 'b', end: true },
      ),
    ]) {
      const s = run(s0, { type: 'hello', from: 'd', name: 'Dana' })
      expect(s.players[3]!.spectator).toBe(true)
      expect(run(s, { type: 'endVote', from: 'd', end: true })).toBe(s)
    }
  })

  it('a writing round that lost its players can recover with newcomers', () => {
    const later = now + AWAY_AFTER_MS + 1
    let s = run(withBob(), { type: 'startWriting', from: 'h' })
    s = reduce(s, { type: 'ping', from: 'h' }, at(later))
    s = reduce(s, { type: 'kick', from: 'h', playerId: 'b' }, at(later)) // Bob left
    s = run(s, { type: 'hello', from: 'c', name: 'Chen' })
    s = run(
      s,
      { type: 'submit', from: 'h', entry: { label: 'Cat' } },
      { type: 'submit', from: 'c', entry: { label: 'Owl' } },
      { type: 'deal', from: 'c' },
    )
    expect(s.phase).toBe('playing')
  })
})

describe('turns and guess votes', () => {
  it('only the player whose turn it is can call a guess', () => {
    const s = playing()
    expect(run(s, { type: 'guess', from: 'b' })).toBe(s)
    expect(run(s, { type: 'guess', from: 'h' }).guess).toEqual({ playerId: 'h', votes: {} })
  })

  it('a majority of the others marks the guess correct and passes the turn', () => {
    let s = run(playing(), { type: 'guess', from: 'h' }, { type: 'vote', from: 'h', correct: true })
    expect(s.guess?.votes).toEqual({}) // can't vote on your own guess
    s = run(s, { type: 'vote', from: 'b', correct: true })
    expect(tally(s, now)).toMatchObject({ yes: 1, needed: 2, eligible: 2, correct: false })
    s = run(s, { type: 'vote', from: 'c', correct: true })
    expect(s.players[0]!.solved).toBe(true)
    expect(s.guess).toBeUndefined()
    expect(s.turn).toBe('b')
  })

  it('a wrong guess passes the turn and the player keeps playing', () => {
    const s = run(
      playing(),
      { type: 'guess', from: 'h' },
      { type: 'vote', from: 'b', correct: false },
      { type: 'vote', from: 'c', correct: true },
    )
    expect(s.players[0]!.solved).toBe(false)
    expect(s.guess).toBeUndefined()
    expect(s.turn).toBe('b')
  })

  it('a voter can change their mind; the vote closes once the outcome is certain', () => {
    let s = run(playing(), { type: 'guess', from: 'h' }, { type: 'vote', from: 'b', correct: true })
    expect(run(s, { type: 'vote', from: 'b', correct: true })).toBe(s) // same vote again
    expect(s.guess?.votes).toEqual({ b: true })
    // With two voters, one "not quite" makes a majority for "correct" impossible.
    s = run(s, { type: 'vote', from: 'b', correct: false })
    expect(s.guess).toBeUndefined()
    expect(s.players[0]!.solved).toBe(false)
    expect(s.turn).toBe('b')
  })

  it('away players do not block a vote', () => {
    let s = playing()
    s = reduce(s, { type: 'ping', from: 'h' }, at(now + AWAY_AFTER_MS))
    s = reduce(s, { type: 'ping', from: 'b' }, at(now + AWAY_AFTER_MS))
    const later = now + AWAY_AFTER_MS + 1
    s = reduce(s, { type: 'guess', from: 'h' }, at(later))
    s = reduce(s, { type: 'vote', from: 'b', correct: true }, at(later)) // c is away
    expect(s.players[0]!.solved).toBe(true)
  })

  it('a vote is decided once the last missing voter goes away', () => {
    const later = now + AWAY_AFTER_MS + 1
    let s = run(playing(), { type: 'guess', from: 'h' }, { type: 'vote', from: 'b', correct: true })
    expect(s.guess).toBeDefined() // still waiting for c
    s = reduce(s, { type: 'ping', from: 'b' }, at(later)) // c never comes back
    expect(s.players[0]!.solved).toBe(true)
    expect(s.guess).toBeUndefined()
  })

  it('a ping that only refreshes lastSeen keeps the version', () => {
    const s = playing()
    const pinged = reduce(s, { type: 'ping', from: 'b' }, at(now + 5))
    expect(pinged.players[1]!.lastSeen).toBe(now + 5)
    expect(pinged.version).toBe(s.version)
  })

  it('the guesser can withdraw and keep asking', () => {
    const s = run(playing(), { type: 'guess', from: 'h' }, { type: 'withdrawGuess', from: 'h' })
    expect(s.guess).toBeUndefined()
    expect(s.turn).toBe('h')
  })

  it('passing skips solved players and the game ends when all are solved', () => {
    const solve = (s: GameState, id: string, voters: string[]) =>
      run(
        s,
        { type: 'guess', from: id },
        ...voters.map((v): ClientMessage => ({ type: 'vote', from: v, correct: true })),
      )
    let s = solve(playing(), 'h', ['b', 'c'])
    s = run(s, { type: 'pass', from: 'b' })
    expect(s.turn).toBe('c')
    s = run(s, { type: 'pass', from: 'c' })
    expect(s.turn).toBe('b') // h is solved
    s = solve(s, 'b', ['h', 'c'])
    expect(s.turn).toBe('c')
    s = solve(s, 'c', ['h', 'b'])
    expect(s.phase).toBe('finished')
  })

  it('only the active player passes, unless they are away', () => {
    const s = playing()
    expect(run(s, { type: 'pass', from: 'b' })).toBe(s)
    const later = now + AWAY_AFTER_MS + 1
    const away = reduce(s, { type: 'pass', from: 'b' }, at(later))
    expect(away.turn).toBe('b')
  })
})

describe('shared controls', () => {
  it('ending early needs a majority vote', () => {
    let s = run(playing(), { type: 'endVote', from: 'h', end: true })
    expect(endTally(s, now)).toEqual({ votes: 1, needed: 2, reached: false })
    s = run(
      s,
      { type: 'endVote', from: 'h', end: false },
      { type: 'endVote', from: 'b', end: true },
    )
    expect(s.endVotes).toEqual(['b'])
    s = run(s, { type: 'endVote', from: 'c', end: true })
    expect(s.phase).toBe('finished')
    expect(s.turn).toBeUndefined()
  })

  it('ending early is decided once enough players have gone away', () => {
    let s = run(playing(), { type: 'endVote', from: 'h', end: true })
    s = reduce(s, { type: 'ping', from: 'h' }, at(now + AWAY_AFTER_MS))
    s = reduce(s, { type: 'ping', from: 'h' }, at(now + AWAY_AFTER_MS + 1)) // b and c left
    expect(s.phase).toBe('finished')
  })

  it('anyone can remove players who went away or spectators, but nobody else', () => {
    const s = withBob()
    expect(run(s, { type: 'kick', from: 'h', playerId: 'b' })).toBe(s) // Bob is here
    const later = now + AWAY_AFTER_MS + 1
    const s2 = reduce(s, { type: 'ping', from: 'h' }, at(later))
    const kicked = reduce(s2, { type: 'kick', from: 'h', playerId: 'b' }, at(later))
    expect(kicked.players.map((p) => p.id)).toEqual(['h'])
    expect(kicked.kicked).toEqual(['b'])
    expect(reduce(s2, { type: 'kick', from: 'b', playerId: 'h' }, at(later))).toBe(s2) // the relay stays
  })

  it('does not remove assigned players mid-game', () => {
    const s = playing()
    expect(
      reduce(s, { type: 'kick', from: 'h', playerId: 'b' }, at(now + 10 * AWAY_AFTER_MS)),
    ).toBe(s)
  })

  it('keeps removed players out when they say hello again', () => {
    const later = now + AWAY_AFTER_MS + 1
    const s = reduce(withBob(), { type: 'kick', from: 'h', playerId: 'b' }, at(later))
    expect(run(s, { type: 'hello', from: 'b', name: 'Bob' })).toBe(s)
    expect(run(s, { type: 'hello', from: 'b2', name: 'Bob' }).players).toHaveLength(2)
  })

  it('can() answers what a button would do, without changing anything', () => {
    const s = { ...withBob(), sentAt: now + AWAY_AFTER_MS + 1 }
    expect(can(s, { type: 'kick', from: 'h', playerId: 'b' })).toBe(true)
    expect(can(s, { type: 'kick', from: 'b', playerId: 'h' })).toBe(false) // the relay stays
    expect(can(s, { type: 'startWriting', from: 'b' })).toBe(true)
    expect(can(s, { type: 'startWriting', from: 'stranger' })).toBe(false)
    expect(s.phase).toBe('lobby')
  })

  it('the creator leaving closes the room', () => {
    const s = run(withBob(), { type: 'leave', from: 'h' })
    expect(s.closed).toBe(true)
  })

  it('anyone can start a new round with fresh entries', () => {
    const done = run(
      playing(),
      { type: 'endVote', from: 'h', end: true },
      { type: 'endVote', from: 'b', end: true },
    )
    const s = run(done, { type: 'newRound', from: 'c', theme: 'Birds' })
    expect(s).toMatchObject({ phase: 'writing', theme: 'Birds', assignments: {}, endVotes: [] })
    expect(s.players.every((p) => !p.entry && !p.solved && !p.spectator)).toBe(true)
  })

  it('ignores everything once the room is closed', () => {
    const s: GameState = { ...withBob(), closed: true }
    expect(run(s, { type: 'startWriting', from: 'h' })).toBe(s)
    expect(run(s, { type: 'hello', from: 'z', name: 'Zed' })).toBe(s)
  })

  it('marks players away from the relay clock', () => {
    const s = { ...withBob(), sentAt: now + AWAY_AFTER_MS + 1 }
    expect(isAway(s.players[1]!, s.sentAt)).toBe(true)
  })
})

describe('isClientMessage', () => {
  it('rejects unknown actions and malformed input from the network', () => {
    expect(isClientMessage({ type: 'startPlaying', from: 'x', assignments: {} })).toBe(false)
    expect(isClientMessage({ type: 'hello', from: 'x', name: '' })).toBe(false)
    expect(isClientMessage({ type: 'submit', from: 'x', entry: { label: 3 } })).toBe(false)
    expect(isClientMessage({ type: 'vote', from: 'x', correct: 'yes' })).toBe(false)
    expect(isClientMessage(null)).toBe(false)
    expect(isClientMessage({ type: 'hello', from: 'x', name: 'Bob' })).toBe(true)
    expect(isClientMessage({ type: 'vote', from: 'x', correct: false })).toBe(true)
  })

  it('rejects snapshots the UI could not render or count', () => {
    const good = { type: 'state', from: 'h', state: playing() }
    expect(isStateMessage(good)).toBe(true)
    const bad = (patch: object) => isStateMessage({ ...good, state: { ...good.state, ...patch } })
    expect(bad({ guess: { playerId: 'h' } })).toBe(false) // no votes
    expect(bad({ guess: { playerId: 'h', votes: { b: 'yes' } } })).toBe(false)
    expect(bad({ phase: 'party' })).toBe(false)
    expect(bad({ turn: 7 })).toBe(false)
    expect(bad({ endVotes: [1] })).toBe(false)
    expect(bad({ players: [{ id: 'h', name: 'H' }] })).toBe(false)
  })

  it('only accepts http(s) links in entries', () => {
    const submit = (entry: object) => isClientMessage({ type: 'submit', from: 'x', entry })
    expect(submit({ label: 'A', sourceUrl: 'javascript:alert(1)' })).toBe(false)
    expect(submit({ label: 'A', imageUrl: 'data:image/png;base64,AAAA' })).toBe(false)
    expect(submit({ label: 'A', sourceUrl: 'not a url' })).toBe(false)
    expect(submit({ label: 'A', sourceUrl: 'https://en.wikipedia.org/wiki/A' })).toBe(true)
  })
})

describe('points and rounds', () => {
  /** The player whose turn it is guesses, and everyone else votes "correct". */
  const solveTurn = (s: GameState) => {
    const id = s.turn!
    const voters = s.players.filter((p) => !p.spectator && p.id !== id)
    return run(
      s,
      { type: 'guess', from: id },
      ...voters.map((p): ClientMessage => ({ type: 'vote', from: p.id, correct: true })),
    )
  }
  const solveAll = (s: GameState) => {
    while (s.phase === 'playing') s = solveTurn(s)
    return s
  }
  const four = () =>
    run(
      room(),
      { type: 'hello', from: 'b', name: 'Bob' },
      { type: 'hello', from: 'c', name: 'Chen' },
      { type: 'hello', from: 'd', name: 'Dana' },
      { type: 'startWriting', from: 'h' },
      ...['h', 'b', 'c', 'd'].map((id): ClientMessage => ({
        type: 'submit',
        from: id,
        entry: { label: id },
      })),
      { type: 'deal', from: 'h' },
    )

  it('starts at round 1 with no points', () => {
    expect(room()).toMatchObject({ round: 1, scores: {}, roundScores: {}, finishVotes: [] })
  })

  it('awards N-1, N-2, … 0 in the order people guess right', () => {
    const three = solveAll(playing())
    expect(three.phase).toBe('finished')
    expect(three.roundScores).toEqual({ h: 2, b: 1, c: 0 })
    expect(solveAll(four()).roundScores).toEqual({ h: 3, b: 2, c: 1, d: 0 })
  })

  it('players still guessing when a round is ended early get nothing', () => {
    const s = run(
      solveTurn(playing()),
      { type: 'endVote', from: 'h', end: true },
      { type: 'endVote', from: 'b', end: true },
    )
    expect(s.phase).toBe('finished')
    expect(s.scores).toEqual({ h: 2 })
    expect(standings(s).map((r) => [r.player.id, r.total, r.rank])).toEqual([
      ['h', 2, 1],
      ['b', 0, 2],
      ['c', 0, 2],
    ])
  })

  it('adds points up over rounds', () => {
    let s = solveAll(playing())
    s = run(s, { type: 'newRound', from: 'c', theme: 'Birds' })
    expect(s).toMatchObject({ round: 2, roundScores: {}, scores: { h: 2, b: 1, c: 0 } })
    s = run(
      s,
      ...['h', 'b', 'c'].map((id): ClientMessage => ({
        type: 'submit',
        from: id,
        entry: { label: id },
      })),
      { type: 'deal', from: 'b' },
    )
    s = solveAll(s)
    expect(s.scores).toEqual({ h: 4, b: 2, c: 0 })
  })

  it('a majority vote between rounds finishes the game and names the winner', () => {
    let s = solveAll(playing())
    s = run(s, { type: 'finishVote', from: 'c', finish: true })
    expect(finishTally(s, now)).toMatchObject({ votes: 1, needed: 2 })
    s = run(s, { type: 'finishVote', from: 'b', finish: true })
    expect(s.phase).toBe('over')
    expect(winners(s).map((p) => p.id)).toEqual(['h'])
    // Nothing happens after that.
    expect(run(s, { type: 'newRound', from: 'h', theme: '' })).toBe(s)
    expect(run(s, { type: 'hello', from: 'z', name: 'Zed' })).toBe(s)
  })

  it('cannot vote to finish in the middle of a round', () => {
    const s = playing()
    expect(run(s, { type: 'finishVote', from: 'h', finish: true })).toBe(s)
  })

  it('shares the win on a tie', () => {
    const s: GameState = { ...solveAll(playing()), scores: { h: 3, b: 3, c: 1 } }
    expect(winners(s).map((p) => p.id)).toEqual(['h', 'b'])
  })

  it('a presentation screen asking for a snapshot changes nothing', () => {
    const s = playing()
    expect(run(s, { type: 'watch', from: 'screen-1' })).toBe(s)
    expect(isClientMessage({ type: 'watch', from: 'screen-1' })).toBe(true)
  })

  it('refuses ids that would read Object.prototype instead of data', () => {
    for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(isClientMessage({ type: 'hello', from: id, name: 'Sneaky' })).toBe(false)
      expect(isClientMessage({ type: 'kick', from: 'h', playerId: id })).toBe(false)
      const s = playing()
      const forged = { ...s, players: [...s.players, { ...s.players[0]!, id }] }
      expect(isStateMessage({ type: 'state', from: 'h', state: forged })).toBe(false)
    }
    expect(isClientMessage({ type: 'hello', from: 'constructor-ish', name: 'Fine' })).toBe(true)
  })

  it('rejects snapshots with malformed points', () => {
    const good = { type: 'state', from: 'h', state: playing() }
    const bad = (patch: object) => isStateMessage({ ...good, state: { ...good.state, ...patch } })
    expect(isStateMessage(good)).toBe(true)
    expect(bad({ scores: { h: 'lots' } })).toBe(false)
    expect(bad({ round: '2' })).toBe(false)
    expect(bad({ finishVotes: [3] })).toBe(false)
    expect(bad({ phase: 'over' })).toBe(true)
  })
})
