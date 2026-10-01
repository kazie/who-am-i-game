import type { Bridge } from '../bridge/types'
import { followRoom } from './followRoom'
import { randomId } from './ids'
import type { ClientMessage } from './protocol'
import { roomTopic } from './protocol'

/**
 * A presentation screen (TV, shared window): follows a room's snapshots without ever
 * joining it. It has no seat, so it never shows up among the players.
 */
export function useScreen(code: string, deps: { bridge: Bridge; now?: () => number }) {
  // Only identifies this screen's requests; nothing is stored.
  const id = `screen-${randomId()}`
  const watch = () => {
    const msg: ClientMessage = { type: 'watch', from: id }
    deps.bridge.publish(roomTopic(code), msg, { echo: false, volatile: true })
  }
  const room = followRoom(code, deps, {
    onOpen: watch,
    // Snapshots come with the relay's heartbeat anyway; ask again only if the first
    // request went out before the relay was listening.
    onBeat: () => room.state.value || watch(),
  })
  room.start()
  watch()
  return { code, state: room.state, connection: room.connection, hostAlive: room.hostAlive }
}

export type Screen = ReturnType<typeof useScreen>
