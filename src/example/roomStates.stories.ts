import { logEvent } from 'histoire/client'
import { ref } from 'vue'
import * as fixtures from '../fixtures'
import type { GameState } from '../game/protocol'
import { memoryStorage } from '../game/storage'
import type { Alerts } from '../game/useAlerts'
import { useNotes, type Notes } from '../game/useNotes'
import type { Room } from '../game/useRoom'
import { staticRoom, type StaticRoomOptions } from './staticRoom'

/**
 * For the RoomScreen.*.story.vue files only (a `.stories.ts` file: ESLint keeps it out of
 * the game): every screen a player can end up on, each frozen at one state. Buttons only log.
 */

/** Someone who opened the room link and isn't in the game yet. */
export const newcomer = { playerId: 'p9', name: 'Zoe' }

/** Only the creator is in: nobody could take over relaying. */
export const soloLobby: GameState = {
  ...fixtures.lobbyState,
  players: fixtures.lobbyState.players.slice(0, 1),
}
export const closedLobby: GameState = { ...fixtures.lobbyState, closed: true }
/** Chen's tab took over relaying from Alice's. */
export const relayOnChen: GameState = { ...fixtures.playingState, hostId: 'p3' }

const muted = ref(false)
export const alertsSwitch: Alerts = { muted, toggle: () => (muted.value = !muted.value) }

export const myNotes = useNotes(memoryStorage(), () => 'story')
myNotes.add('Am I an animal?')
myNotes.add('Do I have stripes?')
myNotes.setAnswer(myNotes.notes.value[0]!.id, 'yes')
myNotes.setAnswer(myNotes.notes.value[1]!.id, 'no')

/** Extras that only real rooms have. */
interface Extras {
  alerts?: Alerts
  notes?: Notes
}

/** A room frozen at `state`, seen by `meId`. The Source panel shows each variant as a call. */
export const at = (state: GameState | null, meId?: string, opts: StaticRoomOptions = {}) =>
  staticRoom(state, meId, { onAction: (name, args) => logEvent(name, { args }), ...opts })

/** Values the Source panel shows by name: the fixtures and everything above. */
const names = new Map<unknown, string>(
  Object.entries({
    ...fixtures,
    newcomer,
    soloLobby,
    closedLobby,
    relayOnChen,
    alertsSwitch,
    myNotes,
  })
    .filter(([, value]) => typeof value === 'object' && value !== null)
    .map(([name, value]) => [value, name]),
)

/** `value` as it would be written in the story: names for known objects, literals otherwise. */
function literal(value: unknown): string {
  if (names.has(value)) return names.get(value)!
  if (typeof value === 'string') return `'${value}'`
  if (value === null || typeof value !== 'object') return String(value)
  const fields = Object.entries(value).map(([key, v]) => `${key}: ${literal(v)}`)
  return `{ ${fields.join(', ')} }`
}

/**
 * A variant showing RoomScreen with `at(state, meId, opts)`: its props, and its source for
 * Histoire's Source panel, which can't print a live room itself.
 */
export function variant(
  title: string,
  state: GameState | null,
  meId?: string,
  opts: StaticRoomOptions = {},
  extras: Extras = {},
): { title: string; props: { room: Room } & Extras; source: string } {
  const args = [state, meId, opts]
  // Drop trailing arguments left at their defaults.
  if (Object.keys(opts).length === 0) args.pop()
  if (args.length === 2 && meId === undefined) args.pop()
  const attrs = [`:room="at(${args.map(literal).join(', ')})"`]
  if (extras.alerts) attrs.push(`:alerts="${literal(extras.alerts)}"`)
  if (extras.notes) attrs.push(`:notes="${literal(extras.notes)}"`)
  return {
    title,
    props: { room: at(state, meId, opts), ...extras },
    source: `<RoomScreen ${attrs.join(' ')} />`,
  }
}
