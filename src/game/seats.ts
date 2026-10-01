/**
 * Keeps one seat per tab. A duplicated tab inherits a copy of sessionStorage, so it would
 * otherwise act as the same player (or as a second relay for the same room).
 *
 * Uses the Web Locks API: a seat is a lock this tab holds while it is open. The browser
 * answers immediately and lets go of the lock when the tab closes or reloads.
 */
export interface SeatGuard {
  /** Resolves false when another open tab in this browser already holds the seat. */
  claim(seat: string): Promise<boolean>
  release(seat: string): void
}

const lockName = (seat: string) => `who-am-i-seat:${seat}`

export function browserSeatGuard(): SeatGuard {
  if (typeof navigator === 'undefined' || !navigator.locks)
    return { claim: async () => true, release() {} }

  const held = new Map<string, () => void>()
  // Letting go of a lock finishes asynchronously; a claim right after a release (leaving a
  // room and opening it again in this tab) must wait for it, or it would see itself.
  const releasing = new Map<string, Promise<unknown>>()
  const requests = new Map<string, Promise<unknown>>()

  return {
    async claim(seat) {
      if (held.has(seat)) return true
      await releasing.get(seat)
      return new Promise((resolve) => {
        const request = navigator.locks.request(lockName(seat), { ifAvailable: true }, (lock) => {
          resolve(lock !== null)
          // Holding on to the callback's promise is what keeps the lock.
          return lock && new Promise<void>((done) => held.set(seat, done))
        })
        requests.set(seat, request)
      })
    },
    release(seat) {
      const done = held.get(seat)
      if (!done) return
      held.delete(seat)
      done()
      releasing.set(
        seat,
        requests.get(seat)!.finally(() => releasing.delete(seat)),
      )
    },
  }
}

let shared: SeatGuard | undefined

/** One guard per tab. */
export function getSeatGuard() {
  shared ??= browserSeatGuard()
  return shared
}
