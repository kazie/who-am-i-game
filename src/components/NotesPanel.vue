<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { LIMITS } from '../game/protocol'
import { groupNotes, MAX_NOTES, type Answer, type Note, type Notes } from '../game/useNotes'
import AppIcon from './AppIcon.vue'
import IndexCard from './IndexCard.vue'

const props = defineProps<{ notes: Notes }>()

const ANSWERS: { value: Answer; short: string; label: string }[] = [
  { value: 'yes', short: 'Yes', label: 'Yes' },
  { value: 'no', short: 'No', label: 'No' },
  { value: 'maybe', short: '?', label: 'Not sure' },
]
const text = ref('')
const canAdd = computed(() => text.value.trim().length > 0)
const titleId = useId()
const groups = computed(() =>
  groupNotes(props.notes.notes.value).map((g) => ({
    ...g,
    title: ANSWERS.find((a) => a.value === g.answer)?.label ?? 'No answer yet',
  })),
)
/** The note whose actions (move, edit, remove) are showing. */
const open = ref<string>()
/** The note being rewritten, and its new text so far. */
const editing = ref<{ id: string; text: string }>()

/** Focuses an input as soon as it appears. */
const vFocus = { mounted: (el: HTMLElement) => el.focus() }

function add(answer?: Answer) {
  props.notes.add(text.value, answer)
  text.value = ''
}

const root = useTemplateRef<HTMLElement>('root')
const newNote = useTemplateRef<HTMLInputElement>('newNote')

/** Focus goes back to the note, so keyboard and screen reader users don't lose their place. */
async function focusNote(id: string) {
  await nextTick()
  root.value?.querySelector<HTMLElement>(`[data-note="${id}"]`)?.focus()
}

function startEdit(n: Note) {
  editing.value = { id: n.id, text: n.text }
}

function stopEdit(save: boolean) {
  const e = editing.value
  if (!e) return
  if (save) props.notes.edit(e.id, e.text)
  editing.value = undefined
  void focusNote(e.id)
}

async function remove(n: Note) {
  props.notes.remove(n.id)
  open.value = undefined
  // The add form may only just be back (it hides at MAX_NOTES).
  await nextTick()
  newNote.value?.focus()
}
</script>

<template>
  <IndexCard as="section" head-as="h3" :ruled="false" class="notes" :aria-labelledby="titleId">
    <template #head><span :id="titleId">My notes</span></template>
    <div ref="root" class="stack">
      <!-- At the top, so a phone's keyboard never covers it. -->
      <form v-if="notes.notes.value.length < MAX_NOTES" class="stack tight" @submit.prevent="add()">
        <div class="row add">
          <input
            ref="newNote"
            v-model="text"
            :maxlength="LIMITS.label"
            placeholder="e.g. Am I an animal?"
            aria-label="New note"
          />
          <button type="submit" :disabled="!canAdd">Add</button>
        </div>
        <div class="row add-as" role="group" aria-label="Add with the answer">
          <span class="muted small">Add as:</span>
          <button
            v-for="a in ANSWERS"
            :key="a.value"
            type="button"
            class="chip"
            :disabled="!canAdd"
            :aria-label="`Add as ${a.label}`"
            @click="add(a.value)"
          >
            {{ a.label }}
          </button>
        </div>
      </form>

      <p v-if="!groups.length" class="muted small">
        Jot down the answers you get, so you don't forget them. Only you can see these.
      </p>

      <section v-for="g in groups" :key="g.title" class="group" :aria-label="g.title">
        <p class="group-title muted small" aria-hidden="true">{{ g.title }}</p>
        <ul class="ledger list">
          <li v-for="(n, i) in g.notes" :key="n.id" class="note">
            <form
              v-if="editing?.id === n.id"
              class="row edit"
              @submit.prevent="stopEdit(true)"
              @keydown.esc.stop="stopEdit(false)"
            >
              <input
                v-model="editing.text"
                v-focus
                :maxlength="LIMITS.label"
                :aria-label="`Rewrite ${n.text}`"
              />
              <button type="submit" class="chip" :disabled="!editing.text.trim()">Save</button>
              <button type="button" class="chip" @click="stopEdit(false)">Cancel</button>
            </form>
            <template v-else>
              <div class="line">
                <button
                  type="button"
                  class="bare text"
                  :data-note="n.id"
                  :aria-expanded="open === n.id"
                  title="Move, edit or remove"
                  @click="open = open === n.id ? undefined : n.id"
                >
                  {{ n.text }}
                </button>
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
                </span>
              </div>
              <div v-if="open === n.id" class="row actions">
                <button
                  type="button"
                  class="chip"
                  :disabled="i === 0"
                  :aria-label="`Move ${n.text} up`"
                  @click="notes.move(n.id, -1)"
                >
                  <AppIcon name="arrow-up" /> Up
                </button>
                <button
                  type="button"
                  class="chip"
                  :disabled="i === g.notes.length - 1"
                  :aria-label="`Move ${n.text} down`"
                  @click="notes.move(n.id, 1)"
                >
                  <AppIcon name="arrow-down" /> Down
                </button>
                <button
                  type="button"
                  class="chip"
                  :aria-label="`Edit ${n.text}`"
                  @click="startEdit(n)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="chip"
                  :aria-label="`Remove ${n.text}`"
                  @click="remove(n)"
                >
                  <AppIcon name="x" /> Remove
                </button>
              </div>
            </template>
          </li>
        </ul>
      </section>
    </div>
  </IndexCard>
</template>

<style scoped>
.group-title {
  margin: 0;
  font-weight: 650;
}
/* A ledger on a card: each note sits on its own blue rule. */
.list > .note {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding-inline: 0;
  border-bottom: 1px solid var(--rule-blue);
}
.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
}
/* The note itself: typed on the card, and a button that opens its actions. */
.text {
  flex: 1 1 12ch;
  padding: 2px 0;
  font-family: var(--font-typed);
  font-weight: 400;
  overflow-wrap: anywhere;
}
.text:hover:not(:disabled) {
  text-decoration: underline;
  text-decoration-color: var(--rule-red);
}
.text[aria-expanded='true'] {
  font-weight: 700;
}
.answers,
.actions {
  gap: 4px;
}
.chip.yes[aria-pressed='true'] {
  background: var(--ok);
  border-color: var(--ok);
  color: var(--card);
}
.add,
.edit {
  flex-wrap: nowrap;
}
.add input,
.edit input {
  flex: 1;
  min-width: 0;
}
.add-as {
  gap: 4px 6px;
}
</style>
