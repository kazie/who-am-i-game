<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GameState, Player } from '../game/protocol'
import { can, isAway, isHost, keepsCard } from '../game/reducer'
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

/** The player about to be removed: it is asked once, inline. */
const confirming = ref<string>()
// A question about someone who can no longer be removed (they came back) is dropped, so it
// never reappears by itself later.
watch(rows, (list) => {
  if (confirming.value && !list.some((r) => r.p.id === confirming.value && r.removable))
    confirming.value = undefined
})

function kick(id: string) {
  confirming.value = undefined
  emit('kick', id)
}
</script>

<template>
  <ul class="ledger">
    <li
      v-for="{ p, away, status: label, removable } in rows"
      :key="p.id"
      :class="{ away, asking: confirming === p.id }"
    >
      <template v-if="confirming === p.id">
        <span class="question small">
          Remove {{ p.name }}?
          <template v-if="keepsCard(state, p)"
            >The card {{ p.name }} wrote stays on the table.</template
          >
        </span>
        <span class="row confirm">
          <button class="chip" type="button" @click="kick(p.id)">Remove</button>
          <button class="chip" type="button" @click="confirming = undefined">Cancel</button>
        </span>
      </template>
      <template v-else>
        <span class="name">
          {{ p.name }}
          <span v-if="p.id === meId" class="muted">(you)</span>
          <span v-if="isHost(state, p.id)" class="mark host"
            ><AppIcon name="relay" /> host<span class="sr-only"
              >, keeps the room running</span
            ></span
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
          @click="confirming = p.id"
        >
          Remove
        </button>
      </template>
    </li>
  </ul>
</template>

<style scoped>
li.away:not(.asking) {
  opacity: 0.55;
}
li.asking {
  flex-wrap: wrap;
}
.question {
  flex: 1 1 12ch;
  font-weight: 650;
}
.confirm {
  gap: 4px;
}
.mark {
  color: var(--muted);
  margin-left: 2px;
}
.mark.host {
  font-size: 0.8em;
  font-weight: 500;
}
.mark.turn {
  color: var(--accent);
}
.solved {
  color: var(--ok);
}
</style>
