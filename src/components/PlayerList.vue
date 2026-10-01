<script setup lang="ts">
import { computed } from 'vue'
import type { GameState, Player } from '../game/protocol'
import { can, isAway } from '../game/reducer'

const props = defineProps<{ state: GameState; meId?: string }>()
const emit = defineEmits<{ kick: [playerId: string] }>()

function status(p: Player) {
  if (p.spectator) return 'watching'
  if (props.state.phase === 'writing') return p.entry ? 'entry sent ✅' : 'writing…'
  if (props.state.phase !== 'lobby') return p.solved ? 'solved 🎉' : 'guessing'
  return 'ready'
}

const rows = computed(() =>
  props.state.players.map((p) => ({
    p,
    away: isAway(p, props.state.sentAt),
    status: status(p),
    removable: can(props.state, { type: 'kick', from: props.meId ?? '', playerId: p.id }),
  })),
)
</script>

<template>
  <ul class="players">
    <li v-for="{ p, away, status: label, removable } in rows" :key="p.id" :class="{ away }">
      <span class="name">
        {{ p.name }}
        <span v-if="p.id === state.hostId" title="Their tab keeps the room running">📡</span>
        <span v-if="state.phase === 'playing' && p.id === state.turn" title="Their turn">🎤</span>
        <span v-if="p.id === meId" class="muted">(you)</span>
      </span>
      <span class="muted small">{{ away ? 'away · ' : '' }}{{ label }}</span>
      <button v-if="removable" class="chip" type="button" @click="emit('kick', p.id)">
        Remove
      </button>
    </li>
  </ul>
</template>

<style scoped>
.players {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface-2);
}
li.away {
  opacity: 0.55;
}
.name {
  font-weight: 600;
  flex: 1;
}
</style>
