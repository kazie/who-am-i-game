import type { Bridge, ConnectionStatus, MessageHandler, PublishOptions } from './types'

/**
 * In-process stand-in for the eventbridge, used by tests and stories.
 * Every client created from the same hub sees the others' messages.
 */
export class MemoryHub {
  private readonly clients = new Set<MemoryBridge>()
  private readonly seqs = new Map<string, number>()

  createClient() {
    const client = new MemoryBridge(this)
    this.clients.add(client)
    return client
  }

  /** @internal */
  deliver(sender: MemoryBridge, topic: string, data: unknown, echo: boolean) {
    const seq = (this.seqs.get(topic) ?? 0) + 1
    this.seqs.set(topic, seq)
    // Round-trip through JSON like the real wire does.
    const copy = JSON.stringify(data)
    for (const client of this.clients) {
      if (client === sender && !echo) continue
      queueMicrotask(() => client.receive(topic, JSON.parse(copy), seq))
    }
  }

  /** @internal */
  remove(client: MemoryBridge) {
    this.clients.delete(client)
  }
}

export class MemoryBridge implements Bridge {
  status: ConnectionStatus = 'open'
  private readonly handlers = new Map<string, Set<MessageHandler>>()

  constructor(private readonly hub: MemoryHub) {}

  subscribe(topic: string, handler: MessageHandler) {
    const set = this.handlers.get(topic) ?? new Set()
    this.handlers.set(topic, set)
    set.add(handler)
    return () => void set.delete(handler)
  }

  publish(topic: string, data: unknown, opts: PublishOptions = {}) {
    if (this.status === 'open') this.hub.deliver(this, topic, data, opts.echo ?? true)
  }

  onStatus() {
    return () => {}
  }

  close() {
    this.status = 'closed'
    this.hub.remove(this)
  }

  /** @internal */
  receive(topic: string, data: unknown, seq: number) {
    for (const handler of [...(this.handlers.get(topic) ?? [])]) handler(data, seq)
  }
}
