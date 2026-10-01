import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { MemoryHub, type MemoryBridge } from '../bridge/MemoryBridge'
import RoomScreen from '../components/RoomScreen.vue'
import { withRouter } from '../testRouter'
import { roomTopic } from './protocol'
import { AWAY_AFTER_MS, identityOf, winners } from './reducer'
import { memoryStorage } from './storage'
import {
  HEARTBEAT_MS,
  hostRoom,
  joinRoom,
  storageKeys,
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
    const host = open('ABCDE', hostStorage).room
    const bob = open('ABCDE').room
    const chen = open('ABCDE').room
    bob.join('Bob')
    chen.join('Chen')
    await flush()
    return { host, bob, chen, hostStorage }
  }

  const names = (r: Room) => r.state.value?.players.map((p) => p.name)

  it('players join and everyone sees the same lobby', async () => {
    const { host, bob, chen } = await threePlayers()
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen'])
    expect(names(bob)).toEqual(['Hana', 'Bob', 'Chen'])
    expect(chen.me.value?.name).toBe('Chen')
    expect(bob.isHost.value).toBe(false)
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
    expect(host.isHost.value).toBe(true)
    expect(names(host)).toEqual(['Hana', 'Bob', 'Chen'])
    host.startWriting()
    await flush()
    expect(bob.state.value?.phase).toBe('writing')
  })

  it('a host seat without saved state falls back to joining as a player', async () => {
    const { host } = await threePlayers()
    const storage = memoryStorage()
    hostRoom({ code: 'ABCDE', theme: 'x', name: 'Ghost' }, { storage })
    storage.removeItem(storageKeys.state('ABCDE'))
    const lost = open('ABCDE', storage).room
    expect(lost.identity.value).toBeNull()
    lost.join('Ghost')
    await flush()
    expect(lost.isHost.value).toBe(false)
    expect(names(host)).toContain('Ghost')
    expect(lost.me.value?.name).toBe('Ghost')
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

  it('the creator leaving closes the room for everyone', async () => {
    const { host, bob, hostStorage } = await threePlayers()
    host.leave()
    await flush()
    expect(bob.state.value?.closed).toBe(true)
    expect(hostStorage.getItem(storageKeys.state('ABCDE'))).toBeNull()
    expect(host.identity.value).toBeNull()
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
    expect(dup.isHost.value).toBe(false)
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

  it('notices when the host goes quiet', async () => {
    const { bob } = await threePlayers()
    expect(bob.hostAlive.value).toBe(true)
    scopes[0]!.stop()
    vi.advanceTimersByTime(AWAY_AFTER_MS + HEARTBEAT_MS)
    await flush()
    expect(bob.hostAlive.value).toBe(false)
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
})
