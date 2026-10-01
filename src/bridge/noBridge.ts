/**
 * Stand-in for BridgeClient inside Histoire (see histoire.config.ts). The stories are a
 * static site with no game server, so nothing in them may reach the real bridge; stories
 * use MemoryHub (./MemoryBridge.ts) instead.
 */
export function getBridge(): never {
  throw new Error('Stories must not use the real bridge: use MemoryHub instead.')
}
