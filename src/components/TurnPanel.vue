<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GameState } from '../game/protocol'
import { can, identityOf, isAway, isHost, playerById, tally, turnCountLabel } from '../game/reducer'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ state: GameState; meId?: string }>()
const emit = defineEmits<{
  guess: []
  withdraw: []
  vote: [correct: boolean]
  pass: []
}>()

const from = computed(() => props.meId ?? '')
const turnPlayer = computed(() => playerById(props.state, props.state.turn))
const myTurn = computed(() => props.state.turn === from.value)
const turnCount = computed(() =>
  turnPlayer.value ? turnCountLabel(props.state, turnPlayer.value.id) : '',
)
const guess = computed(() => props.state.guess)
const guesser = computed(() => playerById(props.state, guess.value?.playerId))
const guessing = computed(() => guess.value?.playerId === from.value)
// Changing your vote counts too, so either answer being allowed means you can vote.
const canVote = computed(
  () =>
    can(props.state, { type: 'vote', from: from.value, correct: true }) ||
    can(props.state, { type: 'vote', from: from.value, correct: false }),
)
const myVote = computed(() => guess.value?.votes[from.value])
/** The votes on the guess being made; undefined when nobody is guessing. */
const t = computed(() => tally(props.state))
/**
 * The card of whoever is asking or guessing: what the others answer about, or compare the
 * spoken guess with. Never your own.
 */
const theirCard = computed(() => {
  // A guess is always made by the player whose turn it is.
  const player = turnPlayer.value
  if (!player || player.id === from.value) return undefined
  const entry = identityOf(props.state, player.id)?.entry
  return entry && { name: player.name, label: entry.label }
})
const canSkip = computed(
  () => !myTurn.value && can(props.state, { type: 'pass', from: from.value }),
)
/**
 * Skipping drops a guess in progress, so it asks once, inline. A new turn, or the skip no
 * longer being possible (the player came back), drops the question, so it never comes back
 * by itself.
 */
const confirmingSkip = ref(false)
watch([() => props.state.turn, canSkip], () => (confirmingSkip.value = false))
function skip() {
  confirmingSkip.value = false
  emit('pass')
}
/** The host may skip a turn that isn't stuck; anyone may skip an away player. */
const skipLabel = computed(() => {
  const p = turnPlayer.value
  if (!p) return ''
  if (isAway(p, props.state.sentAt) && !isHost(props.state, from.value))
    return `${p.name} is away: skip their turn`
  return `Skip ${p.name}'s turn`
})
</script>

<template>
  <div v-if="turnPlayer" class="callout stack" :class="{ now: myTurn || guessing }">
    <!-- Read out turn changes, a guess starting and the votes coming in. -->
    <div class="stack tight" aria-live="polite">
      <template v-if="t">
        <h2 v-if="guessing">Say your guess out loud!</h2>
        <h2 v-else>{{ guesser?.name }} is guessing</h2>
        <p class="muted small">
          Votes: {{ t.yes }} correct, {{ t.no }} not quite. {{ t.needed }} of
          {{ t.eligible }} needed.
        </p>
      </template>
      <template v-else>
        <h2>
          <AppIcon name="mic" class="mic" />
          {{ myTurn ? 'Your turn' : `${turnPlayer.name} is asking` }}
        </h2>
        <p class="muted small count">{{ turnCount }}</p>
      </template>
    </div>

    <!-- Outside the live region: a screen reader must never say someone's card unasked. -->
    <p v-if="theirCard" class="answer">
      {{ theirCard.name }}'s card: <strong>{{ theirCard.label }}</strong>
    </p>

    <template v-if="t">
      <div v-if="canVote" class="row" role="group" aria-label="Your vote">
        <button :aria-pressed="myVote === true" @click="emit('vote', true)">
          <AppIcon name="check" /> Correct
        </button>
        <button :aria-pressed="myVote === false" @click="emit('vote', false)">
          <AppIcon name="x" /> Not quite
        </button>
      </div>
      <button v-if="guessing" @click="emit('withdraw')">Never mind, keep asking</button>
    </template>

    <template v-else-if="myTurn">
      <p class="muted small">
        Ask one yes/no question about your own card, like "Am I an animal?". Think you know who you
        are? Make your guess and the others vote.
      </p>
      <div class="row">
        <button class="primary" @click="emit('guess')">I want to guess</button>
        <button @click="emit('pass')">Done, next player</button>
      </div>
    </template>

    <p v-else class="muted small">
      Answer {{ turnPlayer.name }}'s question with yes or no.
      <strong>Never say what's on the card.</strong>
    </p>

    <template v-if="canSkip">
      <div v-if="confirmingSkip" class="row skip">
        <span class="small">
          {{ skipLabel }}?<template v-if="t"> Their guess and its votes are dropped.</template>
        </span>
        <button class="chip" @click="skip">Yes, skip</button>
        <button class="chip" @click="confirmingSkip = false">No</button>
      </div>
      <button v-else class="chip skip" @click="confirmingSkip = true">{{ skipLabel }}</button>
    </template>
  </div>
</template>

<style scoped>
.mic {
  color: var(--accent);
}
.answer {
  font-size: 1.1rem;
}
.answer strong {
  font-family: var(--font-typed);
}
h2 {
  font-size: 1.3rem;
}
.skip {
  align-self: start;
}
</style>
