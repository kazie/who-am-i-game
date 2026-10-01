<script setup lang="ts">
import { computed, ref } from 'vue'
import { LIMITS } from '../game/protocol'

const emit = defineEmits<{ create: [{ theme: string; name: string }] }>()

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
const valid = computed(() => theme.value.trim() && name.value.trim())

function create() {
  if (valid.value) emit('create', { theme: theme.value.trim(), name: name.value.trim() })
}
</script>

<template>
  <form class="panel stack" @submit.prevent="create">
    <h2>Start a game</h2>
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
    <label>
      Your name
      <input v-model="name" :maxlength="LIMITS.name" autocomplete="nickname" required />
    </label>
    <button class="primary" type="submit" :disabled="!valid">Create room</button>
  </form>
</template>
