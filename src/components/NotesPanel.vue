<script setup lang="ts">
import { ref } from 'vue'
import { LIMITS } from '../game/protocol'
import { MAX_NOTES, type Answer, type Notes } from '../game/useNotes'

const props = defineProps<{ notes: Notes }>()

const ANSWERS: { value: Answer; icon: string; label: string }[] = [
  { value: 'yes', icon: '✅', label: 'Yes' },
  { value: 'no', icon: '❌', label: 'No' },
  { value: 'maybe', icon: '🤷', label: 'Not sure' },
]

const text = ref('')

function add() {
  props.notes.add(text.value)
  text.value = ''
}
</script>

<template>
  <section class="panel stack notes">
    <h3>📝 My notes</h3>
    <ul v-if="notes.notes.value.length" class="list">
      <li v-for="n in notes.notes.value" :key="n.id" class="note">
        <span class="text">{{ n.text }}</span>
        <span class="row answers">
          <button
            v-for="a in ANSWERS"
            :key="a.value"
            type="button"
            class="chip"
            :class="{ on: n.answer === a.value }"
            :aria-pressed="n.answer === a.value"
            :title="a.label"
            @click="notes.setAnswer(n.id, n.answer === a.value ? undefined : a.value)"
          >
            {{ a.icon }}
          </button>
          <button
            type="button"
            class="chip"
            title="Remove"
            :aria-label="`Remove ${n.text}`"
            @click="notes.remove(n.id)"
          >
            ✕
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
  </section>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
}
.text {
  flex: 1 1 12ch;
  overflow-wrap: anywhere;
}
.answers {
  gap: 4px;
}
.chip.on {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
  background: var(--surface);
}
.notes h3 {
  margin: 0;
}
.add {
  flex-wrap: nowrap;
}
.add input {
  flex: 1;
}
</style>
