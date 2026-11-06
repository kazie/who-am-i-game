import { assignEntries, MIN_PLAYERS, pickDistinct } from './assign'
import { packById } from './packs'
import type { ClientMessage, GameState, Player } from './protocol'
import { clip, LIMITS } from './protocol'

export { MIN_PLAYERS }
// Hidden tabs only get timers about once a minute, so stay well above that.
export const AWAY_AFTER_MS = 75_000

export function createRoom(opts: {
  code: string
  theme: string
  hostId: string
  hostName: string
  now: number
  /** Play with a ready-made pack instead of writing entries; its theme wins. */
  pack?: string
}): GameState {
  const pack = packById(opts.pack)
  return {
    code: opts.code,
    theme: pack?.theme ?? clip(opts.theme, LIMITS.theme),
    ...(pack ? { pack: pack.id } : {}),
    hostId: opts.hostId,
    phase: 'lobby',
    players: [newPlayer(opts.hostId, opts.hostName, opts.now, false)],
    kicked: [],
    assignments: {},
    endVotes: [],
    round: 1,
    scores: {},
    roundScores: {},
    finishVotes: [],
    version: 1,
    sentAt: opts.now,
  }
}

function newPlayer(id: string, name: string, now: number, spectator: boolean): Player {
  return { id, name: clip(name, LIMITS.name), lastSeen: now, spectator, solved: false }
}

export const playerById = (s: GameState, id: string | undefined) =>
  s.players.find((p) => p.id === id)

export const activePlayers = (s: GameState) => s.players.filter((p) => !p.spectator)

/** With a pack nobody writes: the cards come from the pack. */
export const canStartWriting = (s: GameState) =>
  s.phase === 'lobby' && !s.pack && activePlayers(s).length >= MIN_PLAYERS

/** A pack has one card per player, so it caps the number of players. */
export const packTooSmall = (s: GameState) => {
  const pack = packById(s.pack)
  return pack !== undefined && activePlayers(s).length > pack.entries.length
}

export function canStartPlaying(s: GameState) {
  const players = activePlayers(s)
  if (players.length < MIN_PLAYERS) return false
  if (s.pack) return s.phase === 'lobby' && packById(s.pack) !== undefined && !packTooSmall(s)
  return s.phase === 'writing' && players.every((p) => p.entry)
}

/** The entry `playerId` has to guess, and who wrote it. */
export function identityOf(s: GameState, playerId: string) {
  const author = playerById(s, s.assignments[playerId])
  return author?.entry ? { entry: author.entry, author } : undefined
}

/** `now` is the relay's clock; clients pass the snapshot's `sentAt`. */
export const isAway = (p: Player, now: number) => now - p.lastSeen > AWAY_AFTER_MS

/**
 * Who would take over relaying the room, in order: the active players who are around,
 * in seat order, except the relay itself. Spectators never relay.
 */
export const nextRelays = (s: GameState, now: number = s.sentAt) =>
  activePlayers(s).filter((p) => p.id !== s.hostId && !isAway(p, now))

/**
 * This tab starts relaying the room, because the relay went quiet. Not a message: it
 * happens in the tab that takes over, and the higher version makes everyone follow it.
 */
export const takeOver = (s: GameState, id: string): GameState => ({
  ...s,
  hostId: id,
  version: s.version + 1,
})

/** Moves every lastSeen by `offset` ms, e.g. from the old relay's clock to this tab's. */
export const shiftClock = (s: GameState, offset: number): GameState =>
  offset === 0
    ? s
    : { ...s, players: s.players.map((p) => ({ ...p, lastSeen: p.lastSeen + offset })) }

const majority = (n: number) => Math.floor(n / 2) + 1

/**
 * Vote count for the current guess. Everyone else who is around may vote (solved players
 * too); away players don't block it, but a vote they already cast still counts.
 * A strict majority of the eligible voters decides.
 */
export function tally(s: GameState, now: number = s.sentAt) {
  const g = s.guess
  if (!g) return undefined
  const eligible = activePlayers(s).filter(
    (p) => p.id !== g.playerId && (g.votes[p.id] !== undefined || !isAway(p, now)),
  )
  const votes = eligible.map((p) => g.votes[p.id]).filter((v) => v !== undefined)
  const yes = votes.filter(Boolean).length
  const no = votes.length - yes
  const needed = majority(eligible.length)
  return {
    eligible: eligible.length,
    yes,
    no,
    needed,
    correct: eligible.length > 0 && yes >= needed,
    // A majority for "correct" is no longer possible.
    wrong: eligible.length > 0 && eligible.length - no < needed,
  }
}

/** How many of `voters` count, and how many it takes: a majority of the players around. */
function majorityOf(s: GameState, voters: string[], now: number) {
  const around = activePlayers(s).filter((p) => voters.includes(p.id) || !isAway(p, now))
  const votes = around.filter((p) => voters.includes(p.id)).length
  const needed = majority(around.length)
  return { votes, needed, reached: votes >= needed }
}

/** Votes to end this round early. */
export const endTally = (s: GameState, now: number = s.sentAt) => majorityOf(s, s.endVotes, now)

/** Votes, between rounds, to finish the whole game. */
export const finishTally = (s: GameState, now: number = s.sentAt) =>
  majorityOf(s, s.finishVotes, now)

/** Everyone in the room by total points, best first; equal totals share a rank. */
export function standings(s: GameState) {
  const rows = s.players
    .map((p) => ({ player: p, total: s.scores[p.id] ?? 0, round: s.roundScores[p.id] }))
    .sort((a, b) => b.total - a.total)
  return rows.map((r) => ({ ...r, rank: rows.findIndex((x) => x.total === r.total) + 1 }))
}

/** A closed room or a finished game accepts nothing more. */
export const isTerminal = (s: GameState) => s.closed === true || s.phase === 'over'

/** All cards are revealed: the round, or the whole game, is over. */
export const roundEnded = (s: GameState) => s.phase === 'finished' || s.phase === 'over'

/** Still gathering players or writing entries: no cards are out yet. */
export const beforeDeal = (s: GameState) => s.phase === 'lobby' || s.phase === 'writing'

/** The player(s) with the most points. */
export function winners(s: GameState) {
  const rows = standings(s)
  return rows.filter((r) => r.rank === 1).map((r) => r.player)
}

/** "1 round", "3 rounds". */
export const roundsLabel = (n: number) => `${n} round${n === 1 ? '' : 's'}`

/** Turns `playerId` has finished this round. A solved player never gets another one. */
export const turnsOf = (s: GameState, playerId: string) => s.turnsTaken?.[playerId] ?? 0

/** "1 turn", "4 turns". */
export const turnsLabel = (n: number) => `${n} turn${n === 1 ? '' : 's'}`

/** "1st", "2nd", "3rd", "11th", "22nd". */
export function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}

/** "3rd turn this round": the turn a player is on now. */
export const turnCountLabel = (s: GameState, playerId: string) =>
  `${ordinal(turnsOf(s, playerId) + 1)} turn this round`

export const winnerNames = (s: GameState) =>
  winners(s)
    .map((p) => p.name)
    .join(' & ')

/** The next unsolved player after `after`, in seating order. */
function nextTurn(s: GameState, after: string | undefined): string | undefined {
  const order = activePlayers(s)
  const start = order.findIndex((p) => p.id === after)
  for (let i = 1; i <= order.length; i++) {
    const p = order[(start + i + order.length) % order.length]!
    if (!p.solved) return p.id
  }
  return undefined
}

/** Drops the per-turn fields. */
function withoutTurn(s: GameState): GameState {
  const { turn: _turn, guess: _guess, ...rest } = s
  return rest
}

const finish = (s: GameState): GameState => ({ ...withoutTurn(s), phase: 'finished' })

/**
 * Ends the current turn: the only place a turn ends. `counted` is false when an away
 * player's turn is skipped, since they asked nothing.
 */
function finishTurn(s: GameState, counted = true): GameState {
  const done =
    counted && s.turn
      ? { ...s, turnsTaken: { ...s.turnsTaken, [s.turn]: turnsOf(s, s.turn) + 1 } }
      : s
  const turn = nextTurn(done, s.turn)
  return turn ? { ...withoutTurn(done), turn } : finish(done)
}

/** Adds or removes `id`; the same list back when nothing changes. */
function toggle(list: string[], id: string, on: boolean) {
  if (list.includes(id) === on) return list
  return on ? [...list, id] : list.filter((x) => x !== id)
}

function updatePlayer(s: GameState, id: string, f: (p: Player) => Player): GameState {
  return { ...s, players: s.players.map((p) => (p.id === id ? f(p) : p)) }
}

export interface ReduceDeps {
  now: number
  /** Only `deal` uses it, to shuffle. */
  rng?: () => number
}

/**
 * All game rules, run by the relay tab. Returns the same object when nothing changed,
 * so callers can skip broadcasting.
 */
export function reduce(s: GameState, a: ClientMessage, deps: ReduceDeps): GameState {
  if (a.type === 'ping') {
    const touched = apply(s, a, deps)
    // Time passing can decide an open vote (a voter went away), so the relay's own
    // heartbeat re-counts. A ping that only refreshes lastSeen keeps the version: it is
    // not persisted, and a reloaded relay must not fall behind what players have seen.
    const settled = touched === s ? s : settle(touched, deps.now)
    return settled === touched ? touched : { ...settled, version: s.version + 1 }
  }
  const next = apply(s, a, deps)
  return next === s ? s : { ...next, version: s.version + 1 }
}

/** The first correct guess of a round earns N-1 points, the next N-2, and so on. */
function award(s: GameState, playerId: string): GameState {
  const points = activePlayers(s).length - 1 - Object.keys(s.roundScores).length
  return {
    ...updatePlayer(s, playerId, (p) => ({ ...p, solved: true })),
    scores: { ...s.scores, [playerId]: (s.scores[playerId] ?? 0) + points },
    roundScores: { ...s.roundScores, [playerId]: points },
  }
}

/** Resolves a guess, end-vote or finish-vote whose outcome is now certain. */
function settle(s: GameState, now: number): GameState {
  if (s.phase === 'finished')
    return s.finishVotes.length > 0 && finishTally(s, now).reached ? { ...s, phase: 'over' } : s
  if (s.phase !== 'playing') return s
  const t = tally(s, now)
  if (t?.correct) return finishTurn(award(s, s.guess!.playerId))
  if (t?.wrong) return finishTurn(s)
  return s.endVotes.length > 0 && endTally(s, now).reached ? finish(s) : s
}

/**
 * Would this action do anything? The UI asks this for every button, so it never
 * restates a rule. Judged at the snapshot's clock.
 */
export const can = (s: GameState, a: ClientMessage) => apply(s, a, { now: s.sentAt }) !== s

function apply(s: GameState, a: ClientMessage, { now, rng = Math.random }: ReduceDeps): GameState {
  if (isTerminal(s)) return s
  const touch = (id: string) => updatePlayer(s, id, (p) => ({ ...p, lastSeen: now }))
  const known = playerById(s, a.from)
  const player = known && !known.spectator ? known : undefined

  switch (a.type) {
    case 'hello':
      if (known) return touch(a.from)
      if (s.kicked.includes(a.from)) return s
      return {
        ...s,
        // While entries are still being written a newcomer can write one too, so a room
        // that lost players can always recover. Once cards are dealt they watch until
        // the next round.
        players: [
          ...s.players,
          newPlayer(a.from, a.name, now, s.phase === 'playing' || s.phase === 'finished'),
        ],
      }

    case 'ping':
      return known ? touch(a.from) : s

    case 'watch':
      // Only asks for a snapshot, which the relay always sends.
      return s

    case 'leave': {
      if (!known) return s
      let next = s
      // The relay's tab holds the room: it hands it to the next player who is around, or,
      // with nobody left to take over, the room is gone.
      if (a.from === s.hostId) {
        const successor = nextRelays(s, now)[0]
        if (!successor) return { ...s, closed: true }
        next = { ...s, hostId: successor.id }
      }
      // Leaving while cards are out would orphan an assignment; keep them and let them show
      // as away. Before the deal and between rounds there is nothing to orphan.
      if (s.phase === 'playing' && !known.spectator) return next
      return { ...next, players: next.players.filter((p) => p.id !== a.from) }
    }

    case 'startWriting':
      return player && canStartWriting(s) ? { ...s, phase: 'writing' } : s

    case 'submit':
      // Exactly ONE entry per player, locked once sent.
      if (s.phase !== 'writing' || !player || player.entry) return s
      return updatePlayer(s, a.from, (p) => ({
        ...p,
        lastSeen: now,
        entry: {
          label: clip(a.entry.label, LIMITS.label),
          ...(a.entry.imageUrl ? { imageUrl: a.entry.imageUrl } : {}),
          ...(a.entry.sourceUrl ? { sourceUrl: a.entry.sourceUrl } : {}),
        },
      }))

    case 'deal': {
      if (!player || !canStartPlaying(s)) return s
      const ids = activePlayers(s).map((p) => p.id)
      const pack = packById(s.pack)
      // A pack's cards become the players' entries, as if each had written one.
      const cards = pack ? pickDistinct(pack.entries, ids.length, rng) : []
      const dealt = pack
        ? {
            ...s,
            players: s.players.map((p) => ({ ...p, entry: cards[ids.indexOf(p.id)] ?? p.entry })),
          }
        : s
      return {
        ...dealt,
        phase: 'playing',
        assignments: assignEntries(ids, rng),
        turn: ids[Math.floor(rng() * ids.length)],
        endVotes: [],
        turnsTaken: {},
      }
    }

    case 'guess':
      if (s.phase !== 'playing' || s.turn !== a.from || s.guess || !player) return s
      return { ...s, guess: { playerId: a.from, votes: {} } }

    case 'withdrawGuess': {
      if (s.guess?.playerId !== a.from) return s
      const { guess: _guess, ...rest } = s
      return rest
    }

    case 'vote': {
      if (!s.guess || !player || a.from === s.guess.playerId) return s
      if (s.guess.votes[a.from] === a.correct) return s
      const voted = {
        ...s,
        guess: { ...s.guess, votes: { ...s.guess.votes, [a.from]: a.correct } },
      }
      return settle(voted, now)
    }

    case 'pass': {
      if (s.phase !== 'playing' || !player || !s.turn) return s
      const current = playerById(s, s.turn)
      const ownTurn = a.from === s.turn && !s.guess
      // Anyone may skip the turn of a player who has gone away.
      const skipAway = a.from !== s.turn && current !== undefined && isAway(current, now)
      if (ownTurn) return finishTurn(s)
      return skipAway ? finishTurn(s, false) : s
    }

    case 'endVote': {
      const endVotes = toggle(s.endVotes, a.from, a.end)
      if (s.phase !== 'playing' || !player || endVotes === s.endVotes) return s
      return settle({ ...s, endVotes }, now)
    }

    case 'finishVote': {
      const finishVotes = toggle(s.finishVotes, a.from, a.finish)
      if (s.phase !== 'finished' || !player || finishVotes === s.finishVotes) return s
      return settle({ ...s, finishVotes }, now)
    }

    case 'kick': {
      const target = playerById(s, a.playerId)
      if (!known || !target || target.id === s.hostId || target.id === a.from) return s
      // No one is in charge: you can only clear out players who left, or spectators.
      const allowed = target.spectator || (beforeDeal(s) && isAway(target, now))
      if (!allowed) return s
      return {
        ...s,
        players: s.players.filter((p) => p.id !== a.playerId),
        kicked: [...s.kicked, a.playerId],
      }
    }

    case 'newRound': {
      if (s.phase !== 'finished' || !known) return s
      const pack = packById(a.pack)
      if (a.pack !== undefined && !pack) return s
      const { pack: _pack, ...rest } = withoutTurn(s)
      return {
        ...rest,
        // A pack round gathers in the lobby (newcomers join as players), then deals.
        ...(pack
          ? { pack: pack.id, theme: pack.theme, phase: 'lobby' as const }
          : { theme: clip(a.theme, LIMITS.theme) || s.theme, phase: 'writing' as const }),
        assignments: {},
        endVotes: [],
        round: s.round + 1,
        roundScores: {},
        turnsTaken: {},
        finishVotes: [],
        players: s.players.map(({ entry: _entry, ...p }) => ({
          ...p,
          spectator: false,
          solved: false,
        })),
      }
    }
  }
}
