<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import type { GameState } from '../game/protocol'
import { cardOf, playerById, turnsOf } from '../game/reducer'
import type { Notes } from '../game/useNotes'
import AppIcon from './AppIcon.vue'
import IdentityCard from './IdentityCard.vue'
import NotesPanel from './NotesPanel.vue'

/**
 * Your own card and your notes about it, always at hand while playing: a column that stays
 * put beside the cards on a wide screen, or docked at the bottom of a phone's screen, where
 * it opens on a tap.
 */
const props = defineProps<{
  state: GameState
  meId: string
  /** This player's private notes; only real rooms have them. */
  notes?: Notes
  /** Docked at the bottom of the screen, closed until tapped. */
  docked?: boolean
}>()

const me = computed(() => playerById(props.state, props.meId))
const solved = computed(() => me.value?.solved ?? false)
const card = computed(() => cardOf(props.state, props.meId))
const entry = computed(() => card.value.entry)
const count = computed(() => props.notes?.notes.value.length ?? 0)
const open = ref(false)
const bodyId = useId()
const toggle = useTemplateRef<HTMLButtonElement>('toggle')

/** Escape closes the dock, and focus goes back to what opened it, not into hidden notes. */
function close() {
  if (!props.docked || !open.value) return
  open.value = false
  toggle.value?.focus()
}
</script>

<template>
  <section
    v-if="me"
    class="my-card stack"
    :class="{ docked, panel: docked }"
    aria-label="Your card"
    @keydown.esc="close"
  >
    <button
      v-if="docked"
      ref="toggle"
      type="button"
      class="bare toggle"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="open = !open"
    >
      <span class="who">
        You: <span class="typed">{{ solved && entry ? entry.label : '???' }}</span>
      </span>
      <span v-if="notes && !solved" class="count">My notes ({{ count }})</span>
      <AppIcon :name="open ? 'chevron-down' : 'chevron-up'" />
    </button>

    <div v-show="!docked || open" :id="bodyId" class="body stack">
      <IdentityCard
        v-if="!docked || solved"
        :player-name="me.name"
        :entry="entry"
        :author-name="card.authorName"
        :hidden="!solved"
        :solved="solved"
        :turns="turnsOf(state, me.id)"
        is-me
      />
      <p v-if="solved" class="banner small">
        You got it! +{{ state.roundScores[me.id] ?? 0 }} points. Keep answering and voting for the
        others.
      </p>
      <template v-else>
        <p class="muted small">
          Everyone else can see your card, but you can't. Ask yes/no questions to work out who you
          are.
        </p>
        <NotesPanel v-if="notes" :notes="notes" />
      </template>
    </div>
  </section>
</template>

<style scoped>
/* Docked: a strip along the bottom edge of the screen, like the edge of the table. */
.docked {
  position: sticky;
  bottom: 0;
  z-index: 2;
  gap: 0;
  margin-inline: -16px;
  /* .panel draws the ink rule along the top. */
  padding: 0 16px max(8px, env(safe-area-inset-bottom));
  background: var(--bg);
}
.toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 2px;
}
.who {
  flex: 1;
  overflow-wrap: anywhere;
}
.typed {
  font-family: var(--font-typed);
  font-weight: 700;
}
.count {
  color: var(--accent);
}
.docked .body {
  /* Leaves room above for the turn bar and its buttons. */
  max-height: 50dvh;
  overflow-y: auto;
  padding-bottom: 8px;
}
</style>
