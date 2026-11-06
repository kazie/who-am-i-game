/** The most a card leans either way, in degrees. */
const MAX_TILT = 1.2

/**
 * How crooked a card lies on the table: a small angle from a stable seed (a player's id or
 * name), so a card keeps its angle from one render to the next.
 */
export function tilt(seed: string): string {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.codePointAt(0)!) | 0
  const unit = ((h >>> 0) % 1000) / 999 // 0..1
  return `${((unit * 2 - 1) * MAX_TILT).toFixed(2)}deg`
}
