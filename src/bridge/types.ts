export type ConnectionStatus = 'connecting' | 'open' | 'closed'

export interface PublishOptions {
  /** With echo false, our own subscription on the topic does not receive the message. */
  echo?: boolean
  /** Drop instead of queueing while disconnected: for heartbeats that go stale anyway. */
  volatile?: boolean
}

export type MessageHandler = (data: unknown, seq: number) => void

/** Topic pub/sub, as offered by araisan-meme-eventbridge. */
export interface Bridge {
  readonly status: ConnectionStatus
  /** Returns an unsubscribe function. */
  subscribe(topic: string, handler: MessageHandler): () => void
  publish(topic: string, data: unknown, opts?: PublishOptions): void
  onStatus(listener: (status: ConnectionStatus) => void): () => void
  close(): void
}
