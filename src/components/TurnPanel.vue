<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '../game/protocol'
import { can, identityOf, playerById, tally } from '../game/reducer'

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
const t = computed(() => tally(props.state))
/** What the voters should compare the spoken guess with. */
const answer = computed(() =>
  guess.value ? identityOf(props.state, guess.value.playerId) : undefined,
)
const canSkip = computed(
  () => !myTurn.value && can(props.state, { type: 'pass', from: from.value }),
)
</script>

<template>
  <div v-if="turnPlayer" class="panel stack turn" :class="{ mine: myTurn }">
    <template v-if="guess && t">
      <h3 v-if="guessing">Say your guess out loud!</h3>
      <h3 v-else>{{ guesser?.name }} is guessing</h3>

      <p v-if="answer && !guessing" class="answer">
        Their card: <strong>{{ answer.entry.label }}</strong>
      </p>
      <p class="muted small">
        Votes: {{ t.yes }} correct, {{ t.no }} not quite. {{ t.needed }} of {{ t.eligible }} needed.
      </p>

      <div v-if="canVote" class="row">
        <button :class="{ primary: myVote === true }" @click="emit('vote', true)">
          ✅ Correct
        </button>
        <button :class="{ primary: myVote === false }" @click="emit('vote', false)">
          ❌ Not quite
        </button>
      </div>
      <button v-if="guessing" @click="emit('withdraw')">Never mind, keep asking</button>
    </template>

    <template v-else-if="myTurn">
      <h3>Your turn 🎤</h3>
      <p class="muted small">
        Ask one yes/no question out loud. Think you know who you are? Make your guess and the others
        vote.
      </p>
      <div class="row">
        <button class="primary" @click="emit('guess')">I want to guess</button>
        <button @click="emit('pass')">Done, next player</button>
      </div>
    </template>

    <template v-else>
      <h3>{{ turnPlayer.name }}'s turn 🎤</h3>
      <p class="muted small">Answer their yes/no questions out loud.</p>
      <button v-if="canSkip" @click="emit('pass')">
        {{ turnPlayer.name }} is away: skip their turn
      </button>
    </template>
  </div>
</template>

<style scoped>
.turn.mine {
  border-color: var(--accent);
  border-width: 2px;
}
.answer {
  margin: 0;
  font-size: 1.1rem;
}
</style>
