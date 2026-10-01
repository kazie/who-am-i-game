import type { Bridge, ConnectionStatus, MessageHandler, PublishOptions } from './types'

type Frame =
  | { op: 'subscribe' | 'unsubscribe'; topic: string }
  | { op: 'publish'; topic: string; data: unknown; echo?: boolean }

type SocketLike = Pick<WebSocket, 'readyState' | 'send' | 'close'> & {
  onopen: ((ev: Event) => void) | null
  onclose: ((ev: CloseEvent) => void) | null
  onerror: ((ev: Event) => void) | null
  onmessage: ((ev: MessageEvent) => void) | null
}

export interface BridgeClientOptions {
  createSocket?: (url: string) => SocketLike
  /** Publishes kept while disconnected; older ones are dropped. */
  maxQueue?: number
  minBackoffMs?: number
  maxBackoffMs?: number
}

const OPEN = 1

/**
 * WebSocket client for araisan-meme-eventbridge.
 * Reconnects with exponential backoff and re-subscribes every topic on reconnect.
 */
export class BridgeClient implements Bridge {
  status: ConnectionStatus = 'connecting'

  private socket?: SocketLike
  private readonly handlers = new Map<string, Set<MessageHandler>>()
  private readonly statusListeners = new Set<(s: ConnectionStatus) => void>()
  private queue: Frame[] = []
  private backoff: number
  private retryTimer?: ReturnType<typeof setTimeout>
  private closed = false
  private readonly opts: Required<BridgeClientOptions>

  constructor(
    private readonly url: string,
    opts: BridgeClientOptions = {},
  ) {
    this.opts = {
      createSocket: (u) => new WebSocket(u),
      maxQueue: 100,
      minBackoffMs: 500,
      maxBackoffMs: 10_000,
      ...opts,
    }
    this.backoff = this.opts.minBackoffMs
    this.connect()
  }

  subscribe(topic: string, handler: MessageHandler) {
    let set = this.handlers.get(topic)
    if (!set) {
      set = new Set()
      this.handlers.set(topic, set)
      this.sendNow({ op: 'subscribe', topic })
    }
    set.add(handler)
    return () => {
      const current = this.handlers.get(topic)
      if (!current?.delete(handler) || current.size > 0) return
      this.handlers.delete(topic)
      this.sendNow({ op: 'unsubscribe', topic })
    }
  }

  publish(topic: string, data: unknown, opts: PublishOptions = {}) {
    const frame: Frame = {
      op: 'publish',
      topic,
      data,
      ...(opts.echo === false ? { echo: false } : {}),
    }
    if (this.isOpen()) this.sendNow(frame)
    else if (!opts.volatile) {
      this.queue.push(frame)
      if (this.queue.length > this.opts.maxQueue) this.queue.shift()
    }
  }

  onStatus(listener: (s: ConnectionStatus) => void) {
    this.statusListeners.add(listener)
    return () => void this.statusListeners.delete(listener)
  }

  close() {
    this.closed = true
    clearTimeout(this.retryTimer)
    this.socket?.close()
    this.setStatus('closed')
  }

  private isOpen() {
    return this.socket?.readyState === OPEN
  }

  /** Subscriptions are not queued: they are all replayed on (re)connect. */
  private sendNow(frame: Frame) {
    if (this.isOpen()) this.socket!.send(JSON.stringify(frame))
  }

  private connect() {
    if (this.closed) return
    this.setStatus('connecting')
    let socket: SocketLike
    try {
      socket = this.opts.createSocket(this.url)
    } catch (err) {
      // e.g. a malformed VITE_BRIDGE_URL: keep the app alive and keep retrying.
      console.warn('[bridge] could not connect:', err)
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.onopen = () => {
      this.backoff = this.opts.minBackoffMs
      for (const topic of this.handlers.keys()) this.sendNow({ op: 'subscribe', topic })
      const pending = this.queue
      this.queue = []
      for (const frame of pending) this.sendNow(frame)
      this.setStatus('open')
    }
    socket.onmessage = (ev) => this.handleFrame(ev.data)
    socket.onerror = () => socket.close()
    socket.onclose = () => {
      if (this.socket !== socket || this.closed) return
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.closed) return
    this.setStatus('connecting')
    this.retryTimer = setTimeout(() => this.connect(), this.backoff)
    this.backoff = Math.min(this.backoff * 2, this.opts.maxBackoffMs)
  }

  private handleFrame(raw: unknown) {
    if (typeof raw !== 'string') return
    let frame: { op?: unknown; topic?: unknown; seq?: unknown; data?: unknown; message?: unknown }
    try {
      frame = JSON.parse(raw)
    } catch {
      return
    }
    if (frame.op === 'error') {
      console.warn('[bridge] error:', frame.message)
      return
    }
    if (frame.op !== 'message' || typeof frame.topic !== 'string') return
    const seq = typeof frame.seq === 'number' ? frame.seq : 0
    for (const handler of [...(this.handlers.get(frame.topic) ?? [])]) handler(frame.data, seq)
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status === status) return
    this.status = status
    for (const l of this.statusListeners) l(status)
  }
}

export const DEFAULT_BRIDGE_URL = 'ws://localhost:8080/ws'

let shared: BridgeClient | undefined

/** One connection per tab, to VITE_BRIDGE_URL. */
export function getBridge() {
  shared ??= new BridgeClient(import.meta.env.VITE_BRIDGE_URL || DEFAULT_BRIDGE_URL)
  return shared
}
