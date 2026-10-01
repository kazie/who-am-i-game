import { computed, ref, shallowRef } from 'vue'
import type { ConnectionStatus } from '../bridge/types'
import type { GameState } from '../game/protocol'
import { playerById } from '../game/reducer'
import type { Identity, Room } from '../game/useRoom'

export interface StaticRoomOptions {
  /** Defaults to the state's code. */
  code?: string
  /** Defaults to the matching player's seat, or no seat (the join form) when meId is unset. */
  identity?: Identity | null
  isHost?: boolean
  kicked?: boolean
  hostAlive?: boolean
  connection?: ConnectionStatus
  /** Called instead of sending anything, e.g. Histoire's logEvent. */
  onAction?: (name: string, args: unknown[]) => void
}

/**
 * A Room frozen at one state, for stories and the example walkthrough: RoomScreen renders
 * it like a live room, but nothing is sent and nothing changes.
 */
export function staticRoom(
  state: GameState | null,
  meId?: string,
  opts: StaticRoomOptions = {},
): Room {
  const player = state && meId ? playerById(state, meId) : undefined
  const identity =
    opts.identity !== undefined
      ? opts.identity
      : meId
        ? { playerId: meId, name: player?.name ?? 'You', host: state?.hostId === meId }
        : null
  const log =
    (name: string) =>
    (...args: unknown[]) =>
      opts.onAction?.(name, args)
  const actions = {
    join: log('join'),
    leave: log('leave'),
    startWriting: log('startWriting'),
    submit: log('submit'),
    deal: log('deal'),
    guess: log('guess'),
    withdrawGuess: log('withdrawGuess'),
    vote: log('vote'),
    pass: log('pass'),
    voteToEnd: log('voteToEnd'),
    voteToFinish: log('voteToFinish'),
    kick: log('kick'),
    newRound: log('newRound'),
  }
  return {
    code: opts.code ?? state?.code ?? 'K7QXP',
    state: shallowRef(state),
    identity: ref(identity),
    me: computed(() => player),
    kicked: computed(() => opts.kicked ?? false),
    isHost: computed(() => opts.isHost ?? identity?.host ?? false),
    hostAlive: computed(() => opts.hostAlive ?? true),
    connection: ref(opts.connection ?? 'open'),
    ...actions,
  }
}
