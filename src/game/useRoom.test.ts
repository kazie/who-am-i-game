import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { MemoryHub, type MemoryBridge } from '../bridge/MemoryBridge'
import RoomScreen from '../components/RoomScreen.vue'
import { withRouter } from '../testRouter'
import { roomTopic } from './protocol'
import type { GameState } from './protocol'
import { AWAY_AFTER_MS, identityOf, isAway, winners } from './reducer'
import { memoryStorage } from './storage'
import {
  HEARTBEAT_MS,
  hostRoom,
  joinRoom,
  storageKeys,
  TAKEOVER_STAGGER_MS,
  useRoom,
  type Room,
  type RoomDeps,
} from './useRoom'
import { useScreen } from './useScreen'

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
  await nextTick()
}

describe('useRoom over the in-memory bridge', () => {
  let hub: MemoryHub
  const scopes: ReturnType<typeof effectScope>[] = []

  function inScope<T>(fn: () => T): T {
    const scope = effectScope()
    scopes.push(scope)
    return scope.run(fn)!
  }

  function open(
    code: string,
    storage = memoryStorage(),
    bridge = hub.createClient(),
    extra: Partial<RoomDeps> = {},
  ) {
    const scope = effectScope()
    scopes.push(scope)
    const room = scope.run(() => useRoom(code, { bridge, storage, ...extra }))!
    return { room, storage, bridge, scope }
  }

  /** What a client has published so far (it still goes out). */
  const sent = (spy: MockInstance<MemoryBridge['publish']>) => spy.mock.calls.map((c) => c[1])

  /** A seat check that waits until the test answers it. */
  function deferredSeats() {
    let answer!: (mine: boolean) => void
    const seats = { claim: () => new Promise<boolean>((r) => (answer = r)), release() {} }
    return { seats, answer: (mine: boolean) => answer(mine) }
  }

  /** The player whose turn it is guesses; everyone else votes. Returns the guesser. */
  async function guessTurn(rooms: Room[], correct: boolean) {
    const guesser = rooms.find((r) => r.me.value?.id === rooms[0]!.state.value?.turn)!
    guesser.guess()
    await flush()
    for (const r of rooms) if (r !== guesser) r.vote(correct)
    await flush()
    return guesser
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    })
    hub = new MemoryHub()
  })
  afterEach(() => {
    scopes.splice(0).forEach((s) => s.stop())
    vi.useRealTimers()
  })

  async function threePlayers() {
    const hostStorage = memoryStorage()
    hostRoom({ code: 'ABCDE', theme: 'Animals', name: 'Hana' }, { storage: hostStorage })
    const tabs = { host: open('ABCDE', hostStorage), bob: open('ABCDE'), chen: open('ABCDE') }
    const { host, bob, chen } = { host: tabs.host.room, bob: tabs.bob.room, chen: tabs.chen.room }
    bob.join('Bob')
    chen.join('Chen')
    await flush()
    return { host, bob, chen, hostStorage, tabs }
  }

  const names = (r: Room) => r.state.value?.players.map((p) => p.name)

  it('players join and everyone sees the same lobby', async () => {
    const { host, bob, chen } = await threePlayers()
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen'])
    expect(names(bob)).toEqual(['Hana', 'Bob', 'Chen'])
    expect(chen.me.value?.name).toBe('Chen')
    expect(bob.isRelay.value).toBe(false)
  })

  it('plays a full round where nobody sees their own card and the others vote', async () => {
    const { host, bob, chen } = await threePlayers()
    bob.startWriting() // any player can move the game on, not just the creator
    await flush()
    expect(chen.state.value?.phase).toBe('writing')

    host.submit({ label: 'Fox' })
    bob.submit({ label: 'Owl' })
    chen.submit({ label: 'Cat', imageUrl: 'https://example.com/cat.jpg' })
    bob.submit({ label: 'Second try' })
    await flush()
    expect(host.state.value?.players.map((p) => p.entry?.label)).toEqual(['Fox', 'Owl', 'Cat'])

    chen.deal()
    await flush()
    for (const r of [host, bob, chen]) {
      expect(r.state.value?.phase).toBe('playing')
      expect(identityOf(r.state.value!, r.me.value!.id)?.author.id).not.toBe(r.me.value?.id)
    }

    const rooms = [host, bob, chen]

    // A wrong guess passes the turn.
    const first = await guessTurn(rooms, false)
    expect(first.me.value?.solved).toBe(false)
    expect(host.state.value?.turn).not.toBe(first.me.value?.id)

    // Then everyone gets it right in turn.
    for (let i = 0; i < 3; i++) await guessTurn(rooms, true)
    expect(rooms.every((r) => r.me.value?.solved)).toBe(true)
    expect(bob.state.value?.phase).toBe('finished')
  })

  it('a refreshed player keeps their seat', async () => {
    const { host } = await threePlayers()
    const storage = memoryStorage()
    joinRoom('ABCDE', 'Dana', storage)
    const first = open('ABCDE', storage)
    await flush()
    first.scope.stop()
    const again = open('ABCDE', storage).room
    await flush()
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen', 'Dana'])
    expect(again.me.value?.name).toBe('Dana')
  })

  it('a refreshed host resumes the room from storage', async () => {
    const { bob, hostStorage } = await threePlayers()
    scopes[0]!.stop()
    const host = open('ABCDE', hostStorage).room
    expect(host.isRelay.value).toBe(true)
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen'])
    host.startWriting()
    await flush()
    expect(bob.state.value?.phase).toBe('writing')
  })

  it('a relay that lost its saved state follows the room as a player, keeping its seat', async () => {
    const { bob, hostStorage } = await threePlayers()
    scopes[0]!.stop()
    hostStorage.removeItem(storageKeys.state('ABCDE'))
    const lost = open('ABCDE', hostStorage).room
    expect(lost.isRelay.value).toBe(false)
    expect(lost.state.value).toBeNull()
    // Nobody relays now, so after a while Bob takes over, and Hana is still in the room.
    vi.advanceTimersByTime(AWAY_AFTER_MS + HEARTBEAT_MS)
    await flush()
    expect(bob.isRelay.value).toBe(true)
    expect(lost.me.value?.name).toBe('Hana')
    expect(lost.isRelay.value).toBe(false)
  })

  it('a removed player stays out after a reload, until they join with a new seat', async () => {
    const { host } = await threePlayers()
    const storage = memoryStorage()
    const dana = joinRoom('ABCDE', 'Dana', storage)
    const first = open('ABCDE', storage)
    await flush()
    expect(names(host)).toContain('Dana')

    first.scope.stop() // Dana closes the tab and goes away…
    vi.advanceTimersByTime(AWAY_AFTER_MS + HEARTBEAT_MS)
    await flush()
    host.kick(dana.playerId) // …so anyone may remove her
    await flush()
    expect(host.state.value?.kicked).toContain(dana.playerId)

    // She comes back with the same stored seat and says hello again.
    const reloaded = open('ABCDE', storage).room
    await flush()
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen'])
    expect(reloaded.state.value).not.toBeNull()
    expect(reloaded.me.value).toBeUndefined()
    expect(reloaded.kicked.value).toBe(true)

    reloaded.leave() // "Join again"
    reloaded.join('Dana')
    await flush()
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen', 'Dana'])
  })

  it('says hello again when a snapshot does not list them (first hello was lost)', async () => {
    const { host } = await threePlayers()
    const bridge = hub.createClient()
    const publish = vi.spyOn(bridge, 'publish').mockImplementationOnce(() => {}) // lost
    const storage = memoryStorage()
    joinRoom('ABCDE', 'Dana', storage)
    const dana = open('ABCDE', storage, bridge).room
    expect(publish).toHaveBeenCalledTimes(1)
    host.startWriting() // a snapshot without Dana reaches her, and she answers it
    await flush()
    expect(dana.me.value?.name).toBe('Dana')
  })

  it('the relay leaving hands the room to the next player', async () => {
    const { host, bob, chen, hostStorage, tabs } = await threePlayers()
    const bobStorage = tabs.bob.storage
    host.leave()
    await flush()
    expect(bob.isRelay.value).toBe(true)
    expect(chen.state.value?.hostId).toBe(bob.me.value?.id)
    expect(names(chen)).toEqual(['Bob', 'Chen'])
    expect(hostStorage.getItem(storageKeys.state('ABCDE'))).toBeNull()
    expect(bobStorage.getItem(storageKeys.state('ABCDE'))).not.toBeNull()
    expect(host.identity.value).toBeNull()
    // The game goes on under Bob.
    chen.startWriting()
    await flush()
    expect(bob.state.value?.phase).toBe('writing')
    expect(chen.state.value?.phase).toBe('writing')
    expect(chen.relayChanged.value).toBe(true)
  })

  it('the relay leaving with nobody else around closes the room', async () => {
    const hostStorage = memoryStorage()
    hostRoom({ code: 'ABCDE', theme: 'Animals', name: 'Hana' }, { storage: hostStorage })
    const host = open('ABCDE', hostStorage).room
    const screen = inScope(() => useScreen('ABCDE', { bridge: hub.createClient() }))
    await flush()
    host.leave()
    await flush()
    expect(screen.state.value?.closed).toBe(true)
  })

  it('sends one snapshot per heartbeat, however many players ping', async () => {
    const hostStorage = memoryStorage()
    hostRoom({ code: 'ABCDE', theme: 'Animals', name: 'Hana' }, { storage: hostStorage })
    const bridge = hub.createClient()
    const publish = vi.spyOn(bridge, 'publish')
    open('ABCDE', hostStorage, bridge)
    const bob = open('ABCDE').room
    bob.join('Bob')
    await flush()
    publish.mockClear()
    hostStorage.removeItem(storageKeys.state('ABCDE'))
    vi.advanceTimersByTime(HEARTBEAT_MS)
    await flush()
    // Bob's ping only refreshes lastSeen: it is neither broadcast on its own nor persisted.
    expect(publish).toHaveBeenCalledTimes(1)
    expect(hostStorage.getItem(storageKeys.state('ABCDE'))).toBeNull()
  })

  it('checks in right away when a background tab becomes visible', async () => {
    const { host, bob } = await threePlayers()
    vi.setSystemTime(Date.now() + HEARTBEAT_MS / 2) // no timer has fired yet
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    const bobId = bob.me.value!.id
    expect(host.state.value?.players.find((p) => p.id === bobId)?.lastSeen).toBe(Date.now())
  })

  it('a duplicated creator tab gives up the copied seat instead of becoming a second relay', async () => {
    const { host, hostStorage } = await threePlayers()
    // Duplicating a tab copies sessionStorage.
    const copy = memoryStorage()
    for (const key of [storageKeys.identity('ABCDE'), storageKeys.state('ABCDE')])
      copy.setItem(key, hostStorage.getItem(key)!)
    const { seats, answer } = deferredSeats()
    const bridge = hub.createClient()
    const publish = vi.spyOn(bridge, 'publish')
    const dup = open('ABCDE', copy, bridge, { seats }).room
    await flush()
    expect(publish).not.toHaveBeenCalled() // stays offline until the check answers
    answer(false)
    await flush()
    expect(dup.isRelay.value).toBe(false)
    expect(dup.identity.value).toBeNull()
    expect(copy.getItem(storageKeys.state('ABCDE'))).toBeNull()
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen'])
  })

  it('queues the final "room closed" update instead of dropping it while offline', async () => {
    const hostStorage = memoryStorage()
    hostRoom({ code: 'ABCDE', theme: 'Animals', name: 'Hana' }, { storage: hostStorage })
    const bridge = hub.createClient()
    const publish = vi.spyOn(bridge, 'publish')
    open('ABCDE', hostStorage, bridge).room.leave()
    const closing = publish.mock.calls.filter(
      ([, data]) => (data as { state?: { closed?: boolean } }).state?.closed,
    )
    expect(closing.map(([, , opts]) => opts?.volatile)).toEqual([false])
  })

  it('a presentation screen follows the room without becoming a player', async () => {
    const { host, bob } = await threePlayers()
    const screen = inScope(() => useScreen('ABCDE', { bridge: hub.createClient() }))
    await flush()
    expect(screen.state.value?.players.map((p) => p.name)).toEqual(['Hana', 'Bob', 'Chen'])
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen'])
    bob.startWriting()
    await flush()
    expect(screen.state.value?.phase).toBe('writing')
  })

  it('plays two rounds with points and finishes with a winner', async () => {
    const { host, bob, chen } = await threePlayers()
    const rooms = [host, bob, chen]
    async function playRound() {
      if (host.state.value!.phase === 'lobby') bob.startWriting()
      await flush()
      rooms.forEach((r, i) => r.submit({ label: `Entry ${i}` }))
      await flush()
      chen.deal()
      await flush()
      while (host.state.value?.phase === 'playing') await guessTurn(rooms, true)
    }
    await playRound()
    const firstSolver = Object.entries(host.state.value!.roundScores).find(([, p]) => p === 2)!
    expect(Object.values(host.state.value!.roundScores).sort()).toEqual([0, 1, 2])
    bob.newRound('Birds')
    await flush()
    expect(chen.state.value).toMatchObject({ round: 2, theme: 'Birds', phase: 'writing' })
    await playRound()
    const totals = Object.values(host.state.value!.scores).reduce((a, b) => a + b, 0)
    expect(totals).toBe(6) // 2 + 1 + 0, twice
    expect(host.state.value!.scores[firstSolver[0]]).toBeGreaterThanOrEqual(2)

    bob.voteToFinish(true)
    chen.voteToFinish(true)
    await flush()
    expect(host.state.value?.phase).toBe('over')
    expect(winners(bob.state.value!).length).toBeGreaterThan(0)
  })

  it('someone opening a finished game does not start a hello loop', async () => {
    const { host } = await threePlayers()
    host.state.value = { ...host.state.value!, phase: 'over' }
    const bridge = hub.createClient()
    const publish = vi.spyOn(bridge, 'publish')
    const storage = memoryStorage()
    joinRoom('ABCDE', 'Late', storage)
    open('ABCDE', storage, bridge)
    for (let i = 0; i < 10; i++) await flush()
    const hellos = sent(publish).filter((d) => (d as { type?: string }).type === 'hello')
    expect(hellos).toHaveLength(1)
  })

  it('someone opening a finished game is told so, with the final standings', async () => {
    const { host } = await threePlayers()
    host.state.value = { ...host.state.value!, phase: 'over' }
    const storage = memoryStorage()
    joinRoom('ABCDE', 'Late', storage)
    const late = open('ABCDE', storage).room
    await flush()
    const wrapper = mount(RoomScreen, { ...withRouter(), props: { room: late } })
    expect(wrapper.text()).toContain('This game is over')
    expect(wrapper.text()).toContain('Hana')
  })

  it('picks up a connection that opened during the seat check', async () => {
    const bridge = hub.createClient()
    bridge.status = 'connecting'
    const { seats, answer } = deferredSeats()
    const storage = memoryStorage()
    joinRoom('ABCDE', 'Dana', storage)
    const room = open('ABCDE', storage, bridge, { seats }).room
    bridge.status = 'open' // opened while we weren't listening yet
    answer(true)
    await flush()
    expect(room.connection.value).toBe('open')
  })

  it('notices when the relay goes quiet', async () => {
    const { bob, chen, tabs } = await threePlayers()
    expect(bob.hostAlive.value).toBe(true)
    tabs.host.scope.stop()
    // Offline tabs never take over; on their own they can only tell the relay is gone.
    tabs.bob.bridge.status = 'connecting'
    tabs.chen.bridge.status = 'connecting'
    vi.advanceTimersByTime(AWAY_AFTER_MS + HEARTBEAT_MS)
    await flush()
    expect(bob.hostAlive.value).toBe(false)
    expect(bob.isRelay.value || chen.isRelay.value).toBe(false)
  })

  it('a reloaded relay treats everyone as just seen', async () => {
    const { hostStorage } = await threePlayers()
    vi.advanceTimersByTime(AWAY_AFTER_MS * 3) // the saved lastSeen times are now stale
    scopes[0]!.stop()
    const host = open('ABCDE', hostStorage).room
    const s = host.state.value!
    expect(s.players.every((p) => p.lastSeen === Date.now())).toBe(true)
  })

  it('a reloaded relay is not ignored after many pings', async () => {
    const { bob, hostStorage } = await threePlayers()
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(HEARTBEAT_MS)
      await flush()
    }
    scopes[0]!.stop()
    const host = open('ABCDE', hostStorage).room
    await flush()
    host.startWriting()
    await flush()
    expect(bob.state.value?.phase).toBe('writing')
  })

  it('rejects snapshots carrying unsafe links', async () => {
    const storage = memoryStorage()
    joinRoom('ABCDE', 'Dana', storage)
    const dana = open('ABCDE', storage).room
    const forged = hostRoom(
      { code: 'ABCDE', theme: 'x', name: 'Mallory' },
      { storage: memoryStorage() },
    )
    forged.players[0]!.entry = { label: 'Click me', sourceUrl: 'javascript:alert(1)' }
    hub
      .createClient()
      .publish(roomTopic('ABCDE'), { type: 'state', from: forged.hostId, state: forged })
    await flush()
    expect(dana.state.value).toBeNull()
  })

  it('a stranger cannot take over the room with a forged state', async () => {
    const { bob } = await threePlayers()
    const evil = hub.createClient()
    evil.publish(roomTopic('ABCDE'), {
      type: 'state',
      from: 'evil',
      state: { ...bob.state.value!, hostId: 'evil', version: 999, theme: 'Hacked' },
    })
    await flush()
    expect(bob.state.value?.theme).toBe('Animals')
  })

  it('ignores an older snapshot even when it names a real player as relay', async () => {
    const { bob, chen } = await threePlayers()
    const s = bob.state.value!
    hub.createClient().publish(roomTopic('ABCDE'), {
      type: 'state',
      from: chen.me.value!.id,
      state: { ...s, hostId: chen.me.value!.id, version: s.version - 1, theme: 'Old' },
    })
    await flush()
    expect(bob.state.value?.theme).toBe('Animals')
  })

  describe('when the relay goes quiet', () => {
    const relays = (rooms: Room[]) => rooms.filter((r) => r.isRelay.value)
    const hostIds = (states: (GameState | null)[]) => new Set(states.map((s) => s?.hostId))

    it('the next player takes over, and everyone follows', async () => {
      const { host, bob, chen, tabs } = await threePlayers()
      const screen = inScope(() => useScreen('ABCDE', { bridge: hub.createClient() }))
      await flush()
      const hanaId = host.me.value!.id
      tabs.host.scope.stop() // the creator's laptop dies
      await vi.advanceTimersByTimeAsync(AWAY_AFTER_MS + HEARTBEAT_MS)
      await flush()
      expect(relays([bob, chen])).toEqual([bob])
      expect(hostIds([bob.state.value, chen.state.value, screen.state.value])).toEqual(
        new Set([bob.me.value!.id]),
      )
      expect(chen.hostAlive.value).toBe(true)
      expect(screen.relayChanged.value).toBe(true)
      // The old relay counts as away, so it can be skipped or removed by the usual rules.
      const s = bob.state.value!
      expect(
        isAway(
          s.players.find((p) => p.id === hanaId)!,
          s.sentAt,
        ),
      ).toBe(true)
      expect(tabs.bob.storage.getItem(storageKeys.state('ABCDE'))).not.toBeNull()

      chen.startWriting()
      await flush()
      expect(screen.state.value?.phase).toBe('writing')
    })

    it('the player after that waits a little longer, and takes over if needed', async () => {
      const { bob, chen, tabs } = await threePlayers()
      expect(names(chen)).toEqual(['Hana', 'Bob', 'Chen'])
      tabs.host.scope.stop()
      tabs.bob.scope.stop() // Bob's tab is gone too
      await vi.advanceTimersByTimeAsync(AWAY_AFTER_MS + HEARTBEAT_MS)
      await flush()
      expect(chen.isRelay.value).toBe(false) // still waiting for Bob
      await vi.advanceTimersByTimeAsync(TAKEOVER_STAGGER_MS)
      await flush()
      expect(chen.isRelay.value).toBe(true)
      expect(bob.isRelay.value).toBe(false)
    })

    it('two tabs that both took over settle on one relay', async () => {
      const { bob, chen, tabs } = await threePlayers()
      const screen = inScope(() => useScreen('ABCDE', { bridge: hub.createClient() }))
      await flush()
      tabs.host.scope.stop()
      // Nobody hears Bob take over, so Chen takes over as well.
      const mute = vi.spyOn(tabs.bob.bridge, 'publish').mockImplementation(() => {})
      const chenSends = vi.spyOn(tabs.chen.bridge, 'publish')
      await vi.advanceTimersByTimeAsync(AWAY_AFTER_MS + TAKEOVER_STAGGER_MS + HEARTBEAT_MS)
      await flush()
      const relayedBy = (spy: typeof mute, id: string) =>
        sent(spy).some((d) => (d as { state?: GameState }).state?.hostId === id)
      expect(relayedBy(mute, bob.me.value!.id)).toBe(true)
      expect(relayedBy(chenSends, chen.me.value!.id)).toBe(true)
      mute.mockRestore()
      await vi.advanceTimersByTimeAsync(2 * HEARTBEAT_MS)
      await flush()
      expect(relays([bob, chen])).toHaveLength(1)
      const states = [bob.state.value, chen.state.value, screen.state.value]
      expect(hostIds(states).size).toBe(1)
      // Same version on both sides: the lower id won.
      expect([...hostIds(states)][0]).toBe([bob.me.value!.id, chen.me.value!.id].sort()[0])
    })

    it('a relay that comes back steps down instead of rolling the room back', async () => {
      const { bob, chen, tabs, hostStorage } = await threePlayers()
      tabs.host.scope.stop()
      await vi.advanceTimersByTimeAsync(AWAY_AFTER_MS + HEARTBEAT_MS)
      chen.startWriting()
      await flush()
      expect(bob.state.value?.phase).toBe('writing')

      const hana = open('ABCDE', hostStorage).room // reloads with the old state
      expect(hana.isRelay.value).toBe(true)
      await flush()
      expect(hana.isRelay.value).toBe(false)
      expect(hana.state.value?.phase).toBe('writing')
      expect(hostStorage.getItem(storageKeys.state('ABCDE'))).toBeNull()
      expect(chen.state.value).toMatchObject({ phase: 'writing', hostId: bob.me.value!.id })
      expect(hana.me.value?.name).toBe('Hana') // still seated
    })

    it('a tab that wakes up from sleep neither takes over nor counts everyone as gone', async () => {
      const { host, bob } = await threePlayers()
      vi.setSystemTime(Date.now() + 3 * AWAY_AFTER_MS) // the whole laptop slept
      document.dispatchEvent(new Event('visibilitychange'))
      await flush()
      expect(host.isRelay.value).toBe(true)
      expect(bob.isRelay.value).toBe(false)
      const s = host.state.value!
      expect(s.players.some((p) => isAway(p, s.sentAt))).toBe(false)
    })

    it('spectators never take over', async () => {
      const { host, bob, chen, tabs } = await threePlayers()
      bob.startWriting()
      await flush()
      for (const r of [host, bob, chen]) r.submit({ label: 'x' })
      await flush()
      bob.deal()
      await flush()
      const storage = memoryStorage()
      joinRoom('ABCDE', 'Zed', storage)
      const zed = open('ABCDE', storage).room
      await flush()
      expect(zed.me.value?.spectator).toBe(true)
      for (const tab of Object.values(tabs)) tab.scope.stop()
      await vi.advanceTimersByTimeAsync(5 * AWAY_AFTER_MS)
      await flush()
      expect(zed.isRelay.value).toBe(false)
      expect(zed.hostAlive.value).toBe(false)
    })

    it('queues the handoff snapshot instead of dropping it while offline', async () => {
      const { host, tabs } = await threePlayers()
      const publish = vi.spyOn(tabs.host.bridge, 'publish')
      const hanaId = host.me.value!.id
      host.leave()
      const handoffs = publish.mock.calls.filter(([, data]) => {
        const s = (data as { state?: GameState }).state
        return s !== undefined && s.hostId !== hanaId
      })
      expect(handoffs.map(([, , opts]) => opts?.volatile)).toEqual([false])
    })
  })
})
