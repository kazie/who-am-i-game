<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '../game/protocol'
import { beforeDeal, standings, turnsLabel, turnsOf } from '../game/reducer'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ state: GameState; meId?: string; large?: boolean }>()

const rows = computed(() => standings(props.state))
const over = computed(() => props.state.phase === 'over')
// Turns only mean something once cards are out.
const showTurns = computed(() => !beforeDeal(props.state))
const turns = (id: string) => turnsOf(props.state, id)
</script>

<template>
  <ol class="ledger scores" :class="{ large }">
    <li v-for="r in rows" :key="r.player.id" :class="{ winner: over && r.rank === 1 }">
      <span class="rank">{{ r.rank }}</span>
      <span class="name">
        {{ r.player.name }}<span v-if="r.player.id === meId" class="muted"> (you)</span>
        <span v-if="over && r.rank === 1" class="stamp won">Winner</span>
      </span>
      <span
        v-if="showTurns && !r.player.spectator"
        class="turns muted"
        :title="`${turnsLabel(turns(r.player.id))} this round`"
        ><AppIcon name="mic" />{{ turns(r.player.id)
        }}<span class="sr-only"> turns this round</span></span
      >
      <span v-if="r.round !== undefined" class="round muted"
        >+{{ r.round }}<span class="sr-only"> this round</span></span
      >
      <strong class="total">{{ r.total }}<span class="sr-only"> points</span></strong>
    </li>
  </ol>
</template>

<style scoped>
.scores > li {
  align-items: baseline;
}
.rank {
  width: 1.5em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}
.winner .rank,
.winner .name {
  color: var(--accent);
}
.won {
  margin-left: 6px;
  font-size: 0.8em;
}
.turns {
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}
.round,
.total {
  font-variant-numeric: tabular-nums;
}
.total {
  min-width: 1.5em;
  text-align: right;
}
.large {
  font-size: 1.5rem;
}
</style>
