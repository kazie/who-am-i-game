import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BridgeClient } from './BridgeClient'

class FakeSocket {
  static all: FakeSocket[] = []
  readyState = 0
  sent: unknown[] = []
  onopen: ((ev: Event) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  constructor() {
    FakeSocket.all.push(this)
  }
  send(raw: string) {
    this.sent.push(JSON.parse(raw))
  }
  close() {
    this.readyState = 3
    this.onclose?.({} as CloseEvent)
  }
  open() {
    this.readyState = 1
    this.onopen?.({} as Event)
  }
  receive(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) } as MessageEvent)
  }
}

const create = () =>
  new BridgeClient('ws://test/ws', { createSocket: () => new FakeSocket() as unknown as WebSocket })
const last = () => FakeSocket.all[FakeSocket.all.length - 1]!

describe('BridgeClient', () => {
  beforeEach(() => {
    FakeSocket.all = []
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('subscribes on open and flushes queued publishes', () => {
    const client = create()
    client.subscribe('who-am-i/ABCDE', () => {})
    client.publish('who-am-i/ABCDE', { type: 'ping' }, { echo: false })
    expect(last().sent).toEqual([])
    last().open()
    expect(last().sent).toEqual([
      { op: 'subscribe', topic: 'who-am-i/ABCDE' },
      { op: 'publish', topic: 'who-am-i/ABCDE', data: { type: 'ping' }, echo: false },
    ])
    expect(client.status).toBe('open')
  })

  it('drops volatile publishes while offline instead of replaying them', () => {
    const client = create()
    client.publish('t', { type: 'ping' }, { volatile: true })
    client.publish('t', { type: 'vote' })
    last().open()
    expect(last().sent).toEqual([{ op: 'publish', topic: 't', data: { type: 'vote' } }])
  })

  it('delivers messages to handlers of that topic only', () => {
    const client = create()
    const a = vi.fn()
    const b = vi.fn()
    client.subscribe('a', a)
    client.subscribe('b', b)
    last().open()
    last().receive({ op: 'message', topic: 'a', seq: 7, data: { hi: 1 } })
    last().receive({ op: 'error', message: 'Invalid topic' })
    expect(a).toHaveBeenCalledWith({ hi: 1 }, 7)
    expect(b).not.toHaveBeenCalled()
  })

  it('unsubscribes when the last handler goes away', () => {
    const client = create()
    last().open()
    const off1 = client.subscribe('t', () => {})
    const off2 = client.subscribe('t', () => {})
    off1()
    expect(last().sent).toEqual([{ op: 'subscribe', topic: 't' }])
    off2()
    expect(last().sent).toContainEqual({ op: 'unsubscribe', topic: 't' })
  })

  it('reconnects with backoff and re-subscribes', () => {
    const client = create()
    client.subscribe('t', () => {})
    last().open()
    last().close()
    expect(client.status).toBe('connecting')
    expect(FakeSocket.all).toHaveLength(1)
    vi.advanceTimersByTime(500)
    expect(FakeSocket.all).toHaveLength(2)
    last().open()
    expect(last().sent).toEqual([{ op: 'subscribe', topic: 't' }])
  })

  it('survives a socket constructor that throws and keeps retrying', () => {
    let fail = true
    const client = new BridgeClient('bad url', {
      createSocket: () => {
        if (fail) throw new SyntaxError('Invalid URL')
        return new FakeSocket() as unknown as WebSocket
      },
    })
    expect(client.status).toBe('connecting')
    vi.advanceTimersByTime(500) // first retry also fails
    fail = false
    vi.advanceTimersByTime(1000)
    expect(FakeSocket.all).toHaveLength(1)
    last().open()
    expect(client.status).toBe('open')
  })

  it('stops reconnecting after close()', () => {
    const client = create()
    client.close()
    vi.advanceTimersByTime(60_000)
    expect(FakeSocket.all).toHaveLength(1)
    expect(client.status).toBe('closed')
  })
})
