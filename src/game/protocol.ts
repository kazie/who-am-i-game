/** `finished` ends a round; `over` ends the whole game, with a winner. */
export type Phase = 'lobby' | 'writing' | 'playing' | 'finished' | 'over'

export const LIMITS = {
  name: 30,
  theme: 80,
  label: 80,
  // Resolved thumbnail URLs repeat the percent-encoded file name, so leave plenty of room.
  url: 4000,
} as const

/** Trims and cuts user text to a limit. */
export const clip = (v: string, max: number) => v.trim().slice(0, max)

/** One identity written by a player, e.g. "Marie Curie" + a picture. */
export interface Entry {
  label: string
  /** Direct image URL, already resolved from whatever link the author pasted. */
  imageUrl?: string
  /** The link the author pasted (Wikipedia article, Commons page or image). */
  sourceUrl?: string
}

export interface Player {
  id: string
  name: string
  /** Host clock, ms. */
  lastSeen: number
  /** Joined after the cards were dealt: watches until the next round. */
  spectator: boolean
  entry?: Entry
  solved: boolean
}

/** A guess being voted on: the guesser said it out loud, the others judge it. */
export interface Guess {
  playerId: string
  /** voterId -> "correct?" */
  votes: Record<string, boolean>
}

export interface GameState {
  code: string
  theme: string
  /**
   * The tab that created the room. It holds the state and relays it (the bridge has no
   * memory), but it has no extra say in the game: every player has the same buttons.
   */
  hostId: string
  phase: Phase
  players: Player[]
  /** Removed players; their hellos are ignored. "Join again" gets a new id. */
  kicked: string[]
  /** playerId -> id of the player whose entry they have to guess. */
  assignments: Record<string, string>
  /** Whose turn it is to ask yes/no questions (playing phase). */
  turn?: string
  guess?: Guess
  /** Players who voted to end the round early. */
  endVotes: string[]
  /** 1, 2, 3, … */
  round: number
  /** playerId -> points over all rounds. */
  scores: Record<string, number>
  /** playerId -> points won this round: N-1 for the first correct guess, then N-2, … */
  roundScores: Record<string, number>
  /** Players who voted, between rounds, to finish the whole game. */
  finishVotes: string[]
  /** The creator left: the room is gone for good. */
  closed?: true
  /** Incremented by the host on every change. */
  version: number
  /** Host clock when this snapshot was sent, ms. */
  sentAt: number
}

/** Messages any player (the room creator included) sends over the room topic. */
export type ClientMessage =
  | { type: 'hello'; from: string; name: string }
  | { type: 'ping'; from: string }
  | { type: 'leave'; from: string }
  | { type: 'startWriting'; from: string }
  | { type: 'submit'; from: string; entry: Entry }
  /** Shuffle and hand out the entries. */
  | { type: 'deal'; from: string }
  /** The player whose turn it is says their guess out loud and asks for a vote. */
  | { type: 'guess'; from: string }
  | { type: 'withdrawGuess'; from: string }
  | { type: 'vote'; from: string; correct: boolean }
  /** End the current turn without guessing (or skip an away player's turn). */
  | { type: 'pass'; from: string }
  | { type: 'endVote'; from: string; end: boolean }
  | { type: 'finishVote'; from: string; finish: boolean }
  /** A presentation screen asking for a snapshot; it never becomes a player. */
  | { type: 'watch'; from: string }
  | { type: 'kick'; from: string; playerId: string }
  | { type: 'newRound'; from: string; theme: string }

export interface StateMessage {
  type: 'state'
  from: string
  state: GameState
}

export const roomTopic = (code: string) => `who-am-i/${code}`

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/**
 * Ids key plain records (scores, votes, assignments). An id like "constructor" or
 * "__proto__" would read Object.prototype instead of data, so such ids are refused here,
 * where messages arrive, and every lookup inside the game can stay a plain `rec[id]`.
 */
export const isPlayerId = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 64 && !(v in Object.prototype)
const isString = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max

export function isHttpUrl(v: unknown): v is string {
  if (!isString(v, LIMITS.url)) return false
  try {
    const { protocol } = new URL(v)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}
const isOptHttpUrl = (v: unknown) => v === undefined || isHttpUrl(v)

export function isEntry(v: unknown): v is Entry {
  return (
    isObject(v) &&
    isString(v.label, LIMITS.label) &&
    v.label.trim().length > 0 &&
    // Rendered as <img src> and <a href> for everyone: never allow javascript: and friends.
    isOptHttpUrl(v.imageUrl) &&
    isOptHttpUrl(v.sourceUrl)
  )
}

export function isClientMessage(v: unknown): v is ClientMessage {
  if (!isObject(v) || !isPlayerId(v.from)) return false
  switch (v.type) {
    case 'hello':
      return isString(v.name, LIMITS.name) && v.name.trim().length > 0
    case 'submit':
      return isEntry(v.entry)
    case 'vote':
      return typeof v.correct === 'boolean'
    case 'endVote':
      return typeof v.end === 'boolean'
    case 'finishVote':
      return typeof v.finish === 'boolean'
    case 'kick':
      return isPlayerId(v.playerId)
    case 'newRound':
      return isString(v.theme, LIMITS.theme)
    case 'ping':
    case 'leave':
    case 'startWriting':
    case 'deal':
    case 'guess':
    case 'withdrawGuess':
    case 'pass':
    case 'watch':
      return true
    default:
      return false
  }
}

const PHASES: readonly Phase[] = ['lobby', 'writing', 'playing', 'finished', 'over']

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

const isRecordOf = (v: unknown, valid: (x: unknown) => boolean) =>
  isObject(v) && Object.values(v).every(valid)

const isPlayer = (v: unknown) =>
  isObject(v) &&
  isPlayerId(v.id) &&
  typeof v.name === 'string' &&
  typeof v.lastSeen === 'number' &&
  typeof v.spectator === 'boolean' &&
  typeof v.solved === 'boolean' &&
  (v.entry === undefined || isEntry(v.entry))

const isGuess = (v: unknown) =>
  isObject(v) && isPlayerId(v.playerId) && isRecordOf(v.votes, (x) => typeof x === 'boolean')

/**
 * Anyone can publish on a room topic, so a snapshot is checked as strictly as a
 * submission: everything the UI renders or counts must have the right shape, and every
 * entry's links must be http(s). That keeps a bad snapshot from breaking the page or
 * planting a dangerous link. It does NOT prove who sent it: the bridge has no
 * authentication, so see "Trust" in the README.
 */
export function isStateMessage(v: unknown): v is StateMessage {
  if (!isObject(v) || v.type !== 'state' || typeof v.from !== 'string') return false
  const s = v.state
  return (
    isObject(s) &&
    typeof s.code === 'string' &&
    typeof s.theme === 'string' &&
    typeof s.hostId === 'string' &&
    PHASES.includes(s.phase as Phase) &&
    typeof s.version === 'number' &&
    typeof s.sentAt === 'number' &&
    Array.isArray(s.players) &&
    s.players.every(isPlayer) &&
    isStringArray(s.kicked) &&
    isStringArray(s.endVotes) &&
    isStringArray(s.finishVotes) &&
    typeof s.round === 'number' &&
    isRecordOf(s.scores, (x) => typeof x === 'number') &&
    isRecordOf(s.roundScores, (x) => typeof x === 'number') &&
    isRecordOf(s.assignments, (x) => typeof x === 'string') &&
    (s.turn === undefined || typeof s.turn === 'string') &&
    (s.guess === undefined || isGuess(s.guess)) &&
    (s.closed === undefined || s.closed === true)
  )
}

/**
 * The snapshot a client should switch to, or undefined to ignore it: right room, from the
 * same relay as before, and not older than what we have. `from` is whatever the sender
 * wrote, so this keeps out stale and mismatched snapshots, not a deliberate impostor.
 */
export function acceptSnapshot(
  current: GameState | null,
  data: unknown,
  code: string,
): GameState | undefined {
  if (!isStateMessage(data) || data.state.code !== code) return undefined
  if (current && (data.from !== current.hostId || data.state.version < current.version))
    return undefined
  return data.state
}
