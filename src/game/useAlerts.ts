import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import type { GameState } from './protocol'
import { can } from './reducer'
import type { KeyValueStorage } from './storage'

/** Something needs this player: it is their turn, or a guess waits for their vote. */
export type Attention = 'turn' | 'vote'

export function attentionFor(s: GameState | null, meId: string | undefined): Attention | undefined {
  if (!s || !meId || s.phase !== 'playing') return undefined
  if (s.guess)
    return s.guess.votes[meId] === undefined && can(s, { type: 'vote', from: meId, correct: true })
      ? 'vote'
      : undefined
  return s.turn === meId ? 'turn' : undefined
}

const TITLES: Record<Attention, string> = { turn: '🎤 Your turn!', vote: '🗳️ Your vote!' }
const VIBRATION: Record<Attention, number[]> = { turn: [200], vote: [100, 80, 100] }
export const MUTE_KEY = 'who-am-i:alerts'

type Listen = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>

export interface AlertDeps {
  /** Remembers the mute switch; localStorage, so it holds for every room in this browser. */
  storage: KeyValueStorage
  /** For the title while the tab is hidden. */
  document?: Listen & { hidden: boolean; title: string }
  beep?: (kind: Attention) => void
  vibrate?: (pattern: number[]) => void
}

export interface Alerts {
  muted: Ref<boolean>
  toggle(): void
}

/**
 * Tells this player when something needs them: a short sound, a vibration on phones, and
 * the tab title while it is in the background. Only on a change, never for the state a
 * (re)loaded tab finds when it arrives.
 */
export function useAlerts(
  state: Ref<GameState | null>,
  meId: () => string | undefined,
  deps: AlertDeps,
): Alerts {
  const { storage, document: doc } = deps
  const muted = ref(storage.getItem(MUTE_KEY) === 'off')
  watch(muted, (m) => (m ? storage.setItem(MUTE_KEY, 'off') : storage.removeItem(MUTE_KEY)))

  const attention = computed(() => attentionFor(state.value, meId()))

  // The title as it was before we prefixed it, while we have.
  let original: string | undefined
  function syncTitle() {
    if (!doc) return
    const a = attention.value
    if (a && doc.hidden) {
      original ??= doc.title
      doc.title = `${TITLES[a]} · ${original}`
    } else if (original !== undefined) {
      doc.title = original
      original = undefined
    }
  }

  watch(
    () => [state.value !== null, attention.value] as const,
    ([, next], prev) => {
      syncTitle()
      const [wasLoaded, before] = prev ?? [false, undefined]
      if (!wasLoaded || !next || next === before || muted.value) return
      deps.beep?.(next)
      deps.vibrate?.(VIBRATION[next])
    },
    { immediate: true },
  )

  doc?.addEventListener('visibilitychange', syncTitle)
  onScopeDispose(() => {
    doc?.removeEventListener('visibilitychange', syncTitle)
    if (doc && original !== undefined) doc.title = original
  })

  return { muted, toggle: () => (muted.value = !muted.value) }
}

/**
 * Short WebAudio beeps, no sound files. Browsers only allow sound after the user has
 * interacted with the page, so the audio starts on the first click or key press; before
 * that, beeps are silent.
 */
export function webAudioBeeper(target: Listen = window): {
  beep: (kind: Attention) => void
  dispose: () => void
} {
  const Ctx = typeof AudioContext === 'undefined' ? undefined : AudioContext
  let ctx: AudioContext | undefined
  const unlock = () => {
    try {
      ctx ??= Ctx && new Ctx()
      void ctx?.resume()
    } catch {
      /* no audio on this device */
    }
    dispose()
  }
  const dispose = () => {
    target.removeEventListener('pointerdown', unlock)
    target.removeEventListener('keydown', unlock)
  }
  if (Ctx) {
    target.addEventListener('pointerdown', unlock)
    target.addEventListener('keydown', unlock)
  }

  function tone(c: AudioContext, freq: number, delay: number, length = 0.18) {
    const t = c.currentTime + delay
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + length + 0.02)
  }

  return {
    beep(kind) {
      if (!ctx) return
      if (ctx.state !== 'running') {
        // Suspended, e.g. after the phone slept: try again for the next beep.
        ctx.resume().catch(() => {})
        return
      }
      if (kind === 'turn') {
        tone(ctx, 660, 0)
        tone(ctx, 880, 0.2)
      } else tone(ctx, 523, 0)
    },
    dispose,
  }
}

/** Phones only; Safari has no vibration at all. */
export function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not allowed here */
  }
}
