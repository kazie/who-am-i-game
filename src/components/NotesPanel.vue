<script setup lang="ts">
import { ref, useId } from 'vue'
import { LIMITS } from '../game/protocol'
import { MAX_NOTES, type Answer, type Notes } from '../game/useNotes'
import AppIcon from './AppIcon.vue'
import IndexCard from './IndexCard.vue'

const props = defineProps<{ notes: Notes }>()

const ANSWERS: { value: Answer; short: string; label: string }[] = [
  { value: 'yes', short: 'Yes', label: 'Yes' },
  { value: 'no', short: 'No', label: 'No' },
  { value: 'maybe', short: '?', label: 'Not sure' },
]

const text = ref('')
const titleId = useId()

function add() {
  props.notes.add(text.value)
  text.value = ''
}
</script>

<template>
  <IndexCard as="section" head-as="h3" :ruled="false" class="notes" :aria-labelledby="titleId">
    <template #head><span :id="titleId">My notes</span></template>
    <div class="stack">
      <ul v-if="notes.notes.value.length" class="ledger list">
        <li v-for="n in notes.notes.value" :key="n.id" class="note">
          <span class="text">{{ n.text }}</span>
          <span class="row answers">
            <button
              v-for="a in ANSWERS"
              :key="a.value"
              type="button"
              class="chip"
              :class="{ yes: a.value === 'yes' }"
              :aria-pressed="n.answer === a.value"
              :aria-label="`${n.text}: ${a.label}`"
              :title="a.label"
              @click="notes.setAnswer(n.id, n.answer === a.value ? undefined : a.value)"
            >
              {{ a.short }}
            </button>
            <button
              type="button"
              class="chip"
              title="Remove"
              :aria-label="`Remove ${n.text}`"
              @click="notes.remove(n.id)"
            >
              <AppIcon name="x" />
            </button>
          </span>
        </li>
      </ul>
      <p v-else class="muted small">
        Jot down the answers you get, so you don't forget them. Only you can see these.
      </p>
      <form v-if="notes.notes.value.length < MAX_NOTES" class="row add" @submit.prevent="add">
        <input
          v-model="text"
          :maxlength="LIMITS.label"
          placeholder="e.g. Am I an animal?"
          aria-label="New note"
        />
        <button type="submit" :disabled="!text.trim()">Add</button>
      </form>
    </div>
  </IndexCard>
</template>

<style scoped>
/* A ledger on a card: each note sits on its own blue rule. */
.list > .note {
  flex-wrap: wrap;
  justify-content: space-between;
  padding-inline: 0;
  border-bottom: 1px solid var(--rule-blue);
}
.text {
  flex: 1 1 12ch;
  font-family: var(--font-typed);
  overflow-wrap: anywhere;
}
.answers {
  gap: 4px;
}
.chip.yes[aria-pressed='true'] {
  background: var(--ok);
  border-color: var(--ok);
  color: var(--card);
}
.add {
  flex-wrap: nowrap;
}
.add input {
  flex: 1;
}
</style>
