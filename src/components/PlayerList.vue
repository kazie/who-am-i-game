<script setup lang="ts">
import { computed } from 'vue'
import type { GameState, Player } from '../game/protocol'
import { can, isAway } from '../game/reducer'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ state: GameState; meId?: string }>()
const emit = defineEmits<{ kick: [playerId: string] }>()

function status(p: Player) {
  if (p.spectator) return 'watching'
  if (props.state.phase === 'writing') return p.entry ? 'entry sent' : 'writing…'
  if (props.state.phase !== 'lobby') return p.solved ? 'solved' : 'guessing'
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
  <ul class="ledger">
    <li v-for="{ p, away, status: label, removable } in rows" :key="p.id" :class="{ away }">
      <span class="name">
        {{ p.name }}
        <span v-if="p.id === meId" class="muted">(you)</span>
        <span v-if="p.id === state.hostId" class="mark" title="Their tab keeps the room running"
          ><AppIcon name="relay" /><span class="sr-only">, keeps the room running</span></span
        >
        <span
          v-if="state.phase === 'playing' && p.id === state.turn"
          class="mark turn"
          title="Their turn"
          ><AppIcon name="mic" /><span class="sr-only">, their turn</span></span
        >
      </span>
      <span class="muted small" :class="{ solved: label === 'solved' }"
        >{{ away ? 'away · ' : '' }}{{ label }}</span
      >
      <button
        v-if="removable"
        class="chip"
        type="button"
        :aria-label="`Remove ${p.name}`"
        @click="emit('kick', p.id)"
      >
        Remove
      </button>
    </li>
  </ul>
</template>

<style scoped>
li.away {
  opacity: 0.55;
}
.mark {
  color: var(--muted);
  margin-left: 2px;
}
.mark.turn {
  color: var(--accent);
}
.solved {
  color: var(--ok);
}
</style>
