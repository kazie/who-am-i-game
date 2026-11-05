<script setup lang="ts">
import { computed, ref } from 'vue'
import { LIMITS } from '../game/protocol'
import PackPicker from './PackPicker.vue'

const emit = defineEmits<{ create: [{ theme: string; name: string; pack?: string }] }>()

const SUGGESTIONS = [
  'Big cats',
  'Famous scientists',
  'Animals',
  'Movie characters',
  'Musicians',
  'Historical figures',
  'Cartoon characters',
  'Athletes',
  'Landmarks',
]

const theme = ref('')
const name = ref('')
const pack = ref('')
// A pack brings its own theme.
const valid = computed(() => (pack.value || theme.value.trim()) && name.value.trim())

function create() {
  if (!valid.value) return
  const n = name.value.trim()
  emit(
    'create',
    pack.value ? { theme: '', name: n, pack: pack.value } : { theme: theme.value.trim(), name: n },
  )
}
</script>

<template>
  <form class="panel stack" @submit.prevent="create">
    <h2>Start a game</h2>
    <PackPicker v-model="pack" />
    <template v-if="!pack">
      <label>
        Theme
        <input
          v-model="theme"
          :maxlength="LIMITS.theme"
          placeholder="e.g. Famous scientists"
          required
        />
      </label>
      <div class="row">
        <button v-for="s in SUGGESTIONS" :key="s" type="button" class="chip" @click="theme = s">
          {{ s }}
        </button>
      </div>
    </template>
    <p v-else class="muted small">Nobody needs to write: everyone gets a card from the pack.</p>
    <label>
      Your name
      <input v-model="name" :maxlength="LIMITS.name" autocomplete="nickname" required />
    </label>
    <button class="primary" type="submit" :disabled="!valid">Create room</button>
  </form>
</template>
