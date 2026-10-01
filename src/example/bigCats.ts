import type { ClientMessage, Entry, GameState } from '../game/protocol'
import {
  activePlayers,
  createRoom,
  identityOf,
  playerById,
  reduce,
  winnerNames,
} from '../game/reducer'
import { seededRandom } from '../game/random'
import { bigCatsEntries, roundOneCats } from './entries'

export { bigCatsEntries }

/**
 * A complete example game, "Big cats", played by the real game rules: every state below
 * comes out of the reducer, so the walkthrough stays true when the rules change.
 */

export interface ExampleStep {
  title: string
  text: string
  /** Whose phone the step shows. */
  focus: string
  state: GameState
}

const T0 = 1_760_000_000_000

const PLAYERS = [
  ['alice', 'Alice'],
  ['bob', 'Bob'],
  ['chen', 'Chen'],
  ['dana', 'Dana'],
  ['eve', 'Eve'],
] as const
type Id = (typeof PLAYERS)[number][0]

class Script {
  state: GameState
  readonly steps: ExampleStep[] = []
  // Seeded, so the deal and turn order never change.
  private readonly rng = seededRandom(7)

  constructor() {
    this.state = createRoom({
      code: 'CATS7',
      theme: 'Big cats',
      hostId: 'alice',
      hostName: 'Alice',
      now: T0,
    })
  }

  do(...actions: ClientMessage[]) {
    for (const a of actions) this.state = reduce(this.state, a, { now: T0, rng: this.rng })
    return this
  }

  step(focus: string, title: string, text: string) {
    this.steps.push({ title, text, focus, state: this.state })
    return this
  }

  name = (id: string | undefined) => playerById(this.state, id)?.name ?? '?'
  cardOf = (id: string) => identityOf(this.state, id)!.entry.label
  turn = () => this.state.turn!
  playing = () => this.state.phase === 'playing'
  others = (id: string) => activePlayers(this.state).filter((p) => p.id !== id)

  /** The player whose turn it is guesses; the others vote. Returns the guesser. */
  guess(correct: boolean, voters = this.others(this.turn()).map((p) => p.id)) {
    const id = this.turn()
    this.do(
      { type: 'guess', from: id },
      ...voters.map((v): ClientMessage => ({ type: 'vote', from: v, correct })),
    )
    return id
  }

  writeAll(entries: Record<Id, Entry>) {
    return this.do(
      ...PLAYERS.map(([id]): ClientMessage => ({ type: 'submit', from: id, entry: entries[id] })),
    )
  }
}

function play(): ExampleStep[] {
  const g = new Script()
  const e = bigCatsEntries

  g.step(
    'alice',
    'Alice creates a room',
    'Alice picks the theme "Big cats" and gets the room code CATS7. Alice shares the code (or the link) with the others, and opens the 📺 presentation screen on the TV.',
  )

  g.do(...PLAYERS.slice(1).map(([id, name]): ClientMessage => ({ type: 'hello', from: id, name })))
  g.step(
    'bob',
    'Friends join',
    'Bob, Chen, Dana and Eve open the link and type their names. Nobody is in charge: every player has the same buttons.',
  )

  g.do({ type: 'startWriting', from: 'chen' })
  g.step(
    'dana',
    'Everyone writes one',
    'Chen presses "start writing". Each player now secretly writes ONE big cat, and pastes a Wikipedia link so the card gets a picture.',
  )

  g.do(
    { type: 'submit', from: 'alice', entry: e.lion },
    { type: 'submit', from: 'bob', entry: e.tiger },
    { type: 'submit', from: 'chen', entry: e.serval },
  )
  g.step(
    'dana',
    'Entries come in',
    'Alice wrote Lion, Bob Tiger and Chen Serval. Dana is still writing: finding the Caracal on Wikipedia and pasting the link. Once sent, an entry is locked.',
  )

  g.do(
    { type: 'submit', from: 'dana', entry: e.caracal },
    { type: 'submit', from: 'eve', entry: e.puma },
    { type: 'deal', from: 'eve' },
  )
  const first = g.turn()
  g.step(
    'bob',
    'The cards are handed out',
    `The cats are shuffled so nobody gets their own. Bob's phone shows everyone else's cat with its picture, but Bob's own card just says "Who am I?". The game picked ${g.name(first)} to start.`,
  )

  const stripes = g.cardOf(first) === 'Tiger' ? 'Yes!' : 'No.'
  g.do({ type: 'pass', from: first })
  g.step(
    first,
    'Ask a yes/no question',
    `${g.name(first)} asks out loud: "Do I have stripes?" The others answer: "${stripes}" One question per turn, so ${g.name(first)} presses "Done, next player". Now it's ${g.name(g.turn())}'s turn.`,
  )

  const wrong = g.turn()
  const wrongLabel = roundOneCats.map((c) => c.label).find((l) => l !== g.cardOf(wrong))!
  const voter = g.others(wrong)[0]!.id
  g.do({ type: 'guess', from: wrong }, { type: 'vote', from: voter, correct: false })
  g.step(
    voter,
    'A guess, and a vote',
    `${g.name(wrong)} has an idea and says out loud: "Am I a ${wrongLabel}?" Nobody can see their own card, so the others vote. ${g.name(voter)}'s phone shows the real answer (${g.cardOf(wrong)}), and ${g.name(voter)} votes ❌.`,
  )

  g.do(
    ...g
      .others(wrong)
      .slice(1)
      .map((p): ClientMessage => ({ type: 'vote', from: p.id, correct: false })),
  )
  g.step(
    wrong,
    'Not quite',
    `The majority says ❌, so the turn passes to ${g.name(g.turn())}. ${g.name(wrong)} keeps playing and can guess again on a later turn.`,
  )

  const winner1 = g.guess(true)
  g.step(
    winner1,
    'First correct guess: 4 points',
    `${g.name(winner1)} asks "Am I a ${g.cardOf(winner1)}?" and the others vote ✅. ${g.name(winner1)}'s card is revealed, also on the presentation screen. With 5 players, the first correct guess is worth 4 points.`,
  )

  const awards: string[] = []
  while (g.playing()) {
    const id = g.guess(true)
    awards.push(`${g.name(id)} (${g.cardOf(id)}) +${g.state.roundScores[id]}`)
  }
  g.step(
    'alice',
    'Round 1 is over',
    `The others get theirs in turn: ${awards.join(', ')}. Every correct guess is worth one point less than the one before. All cards are now revealed.`,
  )

  g.do({ type: 'newRound', from: 'bob', theme: 'More big cats' })
  g.writeAll({
    alice: e.cheetah,
    bob: e.snowLeopard,
    chen: e.jaguar,
    dana: e.ocelot,
    eve: e.leopard,
  })
  g.do({ type: 'deal', from: 'dana' })
  g.step(
    'chen',
    'Round 2',
    'Bob starts another round with the theme "More big cats". Everyone writes a new cat, and the cards are dealt again. Points from round 1 carry over.',
  )

  const awards2: string[] = []
  while (g.playing()) {
    const id = g.guess(true)
    awards2.push(`${g.name(id)} +${g.state.roundScores[id]}`)
  }
  g.step(
    'eve',
    'Round 2 is over',
    `This time: ${awards2.join(', ')}. The group could play another round, or vote to finish.`,
  )

  g.do(
    { type: 'finishVote', from: 'alice', finish: true },
    { type: 'finishVote', from: 'chen', finish: true },
  )
  g.step(
    'eve',
    'Voting to finish',
    'Alice and Chen vote to finish the game. It takes a majority (3 of 5), so one more vote is needed.',
  )

  g.do({ type: 'finishVote', from: 'eve', finish: true })
  g.step(
    'eve',
    'We have a winner',
    `Eve's vote makes it a majority, so the game is over. 🏆 ${winnerNames(g.state)} won with the most points over both rounds!`,
  )

  return g.steps
}

export const bigCatsSteps: readonly ExampleStep[] = play()
