import { AWAY_AFTER_MS } from './game/reducer'
import { bigCatsEntries } from './example/entries'
import type { GameState, Player } from './game/protocol'

const T0 = 1_700_000_000_000
/** Long enough ago to count as away. */
const AWAY = AWAY_AFTER_MS + 30_000

const player = (id: string, name: string, extra: Partial<Player> = {}): Player => ({
  id,
  name,
  lastSeen: T0,
  spectator: false,
  solved: false,
  ...extra,
})

const { lion, tiger, serval, caracal } = bigCatsEntries

/** The example game's cats, with their real Wikipedia pictures. */
export const entries = {
  lion,
  tiger,
  serval,
  caracal,
  /** For stories about a player who added no picture link. */
  noPicture: { label: 'Lynx' },
}

export const lobbyState: GameState = {
  code: 'K7QXP',
  theme: 'Big cats',
  hostId: 'p1',
  phase: 'lobby',
  players: [player('p1', 'Alice'), player('p2', 'Bob'), player('p3', 'Chen')],
  kicked: [],
  assignments: {},
  endVotes: [],
  round: 1,
  scores: {},
  roundScores: {},
  finishVotes: [],
  version: 3,
  sentAt: T0,
}

export const writingState: GameState = {
  ...lobbyState,
  phase: 'writing',
  players: [
    player('p1', 'Alice', { entry: entries.lion }),
    player('p2', 'Bob'),
    player('p3', 'Chen', { entry: entries.serval, lastSeen: T0 - AWAY }),
  ],
  version: 6,
}

export const playingState: GameState = {
  ...lobbyState,
  phase: 'playing',
  players: [
    player('p1', 'Alice', { entry: entries.lion }),
    player('p2', 'Bob', { entry: entries.tiger, solved: true }),
    player('p3', 'Chen', { entry: entries.serval }),
    player('p4', 'Dana', { entry: entries.caracal, lastSeen: T0 - AWAY }),
    player('p5', 'Eve', { spectator: true }),
  ],
  // p1 guesses Bob's, p2 guesses Chen's, ...
  assignments: { p1: 'p2', p2: 'p3', p3: 'p4', p4: 'p1' },
  turn: 'p3',
  // Round 2: Bob solved first this round (4 players, so 3 points).
  round: 2,
  scores: { p1: 3, p2: 5, p3: 1, p4: 0 },
  roundScores: { p2: 3 },
  version: 12,
}

/** Chen guessed out loud; Alice already voted "correct". */
export const votingState: GameState = {
  ...playingState,
  guess: { playerId: 'p3', votes: { p1: true } },
  version: 13,
}

export const finishedState: GameState = {
  ...playingState,
  turn: undefined,
  phase: 'finished',
  players: playingState.players.map((p) => (p.id === 'p3' ? { ...p, solved: true } : p)),
  scores: { p1: 3, p2: 5, p3: 3, p4: 0 },
  roundScores: { p2: 3, p3: 2 },
  finishVotes: ['p1'],
  version: 15,
}

/** The group voted to stop: Bob wins. */
export const overState: GameState = {
  ...finishedState,
  phase: 'over',
  finishVotes: ['p1', 'p2', 'p3'],
  version: 16,
}
