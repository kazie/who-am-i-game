export const MIN_PLAYERS = 2

/**
 * Random assignment where nobody gets their own entry.
 * Sattolo's algorithm yields a uniformly random single cycle, which is always a derangement.
 * Returns playerId -> authorId.
 */
export function assignEntries(ids: string[], rng: () => number = Math.random) {
  if (ids.length < MIN_PLAYERS) throw new Error(`Need at least ${MIN_PLAYERS} players`)
  const perm = [...ids]
  for (let i = perm.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * i)
    ;[perm[i], perm[j]] = [perm[j]!, perm[i]!]
  }
  return Object.fromEntries(ids.map((id, i) => [id, perm[i]!]))
}
