<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GameState } from '../game/protocol'
import { LIMITS } from '../game/protocol'
import {
  activePlayers,
  can,
  endTally,
  finishTally,
  MIN_PLAYERS,
  roundsLabel,
  winnerNames,
} from '../game/reducer'

const props = defineProps<{ state: GameState; meId?: string }>()
const emit = defineEmits<{
  startWriting: []
  deal: []
  voteToEnd: [end: boolean]
  voteToFinish: [finish: boolean]
  newRound: [theme: string]
}>()

const nextTheme = ref('')
const players = computed(() => activePlayers(props.state))
const missing = computed(() => players.value.filter((p) => !p.entry).map((p) => p.name))
const from = computed(() => props.meId ?? '')
const ending = computed(() => endTally(props.state))
const iVotedToEnd = computed(() => props.state.endVotes.includes(from.value))
const finishing = computed(() => finishTally(props.state))
const iVotedToFinish = computed(() => props.state.finishVotes.includes(from.value))
</script>

<template>
  <div class="panel stack">
    <h3>Game</h3>

    <template v-if="state.phase === 'lobby'">
      <p class="muted small">Share the room code or link. Anyone can start once everyone is in.</p>
      <button
        class="primary"
        :disabled="!can(state, { type: 'startWriting', from })"
        @click="emit('startWriting')"
      >
        Everyone's here: start writing
      </button>
      <p v-if="players.length < MIN_PLAYERS" class="muted small">
        Need at least {{ MIN_PLAYERS }} players.
      </p>
    </template>

    <template v-else-if="state.phase === 'writing'">
      <button class="primary" :disabled="!can(state, { type: 'deal', from })" @click="emit('deal')">
        Hand out identities
      </button>
      <p v-if="missing.length" class="muted small">Waiting for: {{ missing.join(', ') }}</p>
    </template>

    <template v-else-if="state.phase === 'playing'">
      <p class="muted small">
        Ending early needs a majority: {{ ending.votes }} of {{ ending.needed }} so far.
      </p>
      <button
        :disabled="!can(state, { type: 'endVote', from, end: !iVotedToEnd })"
        @click="emit('voteToEnd', !iVotedToEnd)"
      >
        {{ iVotedToEnd ? 'Take back my vote to end' : 'Vote to end the round and reveal all' }}
      </button>
    </template>

    <template v-else-if="state.phase === 'finished'">
      <form class="stack" @submit.prevent="emit('newRound', nextTheme)">
        <label>
          Next theme
          <input v-model="nextTheme" :maxlength="LIMITS.theme" :placeholder="state.theme" />
        </label>
        <button
          class="primary"
          type="submit"
          :disabled="!can(state, { type: 'newRound', from, theme: '' })"
        >
          Play round {{ state.round + 1 }}
        </button>
      </form>
      <p class="muted small">
        Or call it a day: {{ finishing.votes }} of {{ finishing.needed }} votes to finish and crown
        the winner.
      </p>
      <button
        :disabled="!can(state, { type: 'finishVote', from, finish: !iVotedToFinish })"
        @click="emit('voteToFinish', !iVotedToFinish)"
      >
        {{ iVotedToFinish ? 'Take back my vote to finish' : 'Vote to finish the game' }}
      </button>
    </template>

    <p v-else class="banner">
      Game over after {{ roundsLabel(state.round) }}. 🏆 {{ winnerNames(state) }} won! Create a new
      room to play again.
    </p>
  </div>
</template>
