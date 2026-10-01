// @vitest-environment node
/**
 * Plays a round over a real araisan-meme-eventbridge.
 * Skipped unless BRIDGE_URL is set, e.g.
 *   BRIDGE_URL=ws://localhost:8080/ws pnpm test bridge.integration
 */
import { afterAll, describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { BridgeClient } from '../bridge/BridgeClient'
import { randomRoomCode } from './ids'
import { identityOf } from './reducer'
import { useScreen } from './useScreen'
import { memoryStorage } from './storage'
import { hostRoom, useRoom, type Room } from './useRoom'

const url = process.env.BRIDGE_URL

async function until(what: string, check: () => boolean, ms = 4000) {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 20))
  }
}

describe.skipIf(!url)('real eventbridge', () => {
  const scope = effectScope()
  const clients: BridgeClient[] = []
  afterAll(() => {
    scope.stop()
    clients.forEach((c) => c.close())
  })

  function seat(code: string, storage = memoryStorage()): Room {
    const bridge = new BridgeClient(url!)
    clients.push(bridge)
    return scope.run(() => useRoom(code, { bridge, storage }))!
  }

  it('plays a round, followed by a presentation screen', async () => {
    const code = randomRoomCode()
    const hostStorage = memoryStorage()
    hostRoom({ code, theme: 'Animals', name: 'Hana' }, { storage: hostStorage })
    const host = seat(code, hostStorage)
    const bob = seat(code)
    const chen = seat(code)
    bob.join('Bob')
    chen.join('Chen')
    const screenBridge = new BridgeClient(url!)
    clients.push(screenBridge)
    const screen = scope.run(() => useScreen(code, { bridge: screenBridge }))!

    await until(
      'everyone in the lobby',
      () => host.state.value?.players.length === 3 && chen.state.value?.players.length === 3,
    )
    host.startWriting()
    await until(
      'writing phase',
      () => bob.state.value?.phase === 'writing' && chen.state.value?.phase === 'writing',
    )
    host.submit({ label: 'Fox' })
    bob.submit({ label: 'Owl' })
    chen.submit({ label: 'Cat' })
    await until('all entries', () => host.state.value!.players.every((p) => p.entry))
    bob.deal()
    await until('playing phase', () => [bob, chen].every((r) => r.state.value?.phase === 'playing'))
    const rooms = [host, bob, chen]
    for (const r of rooms)
      expect(identityOf(r.state.value!, r.me.value!.id)?.author.id).not.toBe(r.me.value?.id)
    for (let i = 0; i < 3; i++) {
      const turn = host.state.value!.turn
      await until('everyone to see the turn', () =>
        rooms.every((r) => r.state.value?.turn === turn),
      )
      const guesser = rooms.find((r) => r.me.value?.id === turn)!
      guesser.guess()
      await until('the guess', () => rooms.every((r) => r.state.value?.guess?.playerId === turn))
      for (const r of rooms) if (r !== guesser) r.vote(true)
      await until('the vote', () => guesser.me.value?.solved === true)
    }
    await until('finished phase', () =>
      [host, bob, chen].every((r) => r.state.value?.phase === 'finished'),
    )
    expect(Object.values(host.state.value!.roundScores).sort()).toEqual([0, 1, 2])

    bob.voteToFinish(true)
    chen.voteToFinish(true)
    await until('the screen to show the end', () => screen.state.value?.phase === 'over')
    expect(screen.state.value!.players).toHaveLength(3) // the screen never joined
  })
})
