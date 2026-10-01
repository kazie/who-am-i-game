<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '../game/protocol'
import { standings } from '../game/reducer'

const props = defineProps<{ state: GameState; meId?: string; large?: boolean }>()

const rows = computed(() => standings(props.state))
const over = computed(() => props.state.phase === 'over')
</script>

<template>
  <ol class="scores" :class="{ large }">
    <li v-for="r in rows" :key="r.player.id" :class="{ winner: over && r.rank === 1 }">
      <span class="rank">{{ over && r.rank === 1 ? '🏆' : r.rank }}</span>
      <span class="name">
        {{ r.player.name }}<span v-if="r.player.id === meId" class="muted"> (you)</span>
      </span>
      <span v-if="r.round !== undefined" class="round muted">+{{ r.round }}</span>
      <strong class="total">{{ r.total }}</strong>
    </li>
  </ol>
</template>

<style scoped>
.scores {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface-2);
}
li.winner {
  outline: 2px solid var(--accent);
}
.rank {
  width: 1.75em;
  text-align: center;
  font-weight: 700;
}
.name {
  flex: 1;
  font-weight: 600;
}
.total {
  font-variant-numeric: tabular-nums;
}
.large {
  font-size: 1.5rem;
}
</style>
