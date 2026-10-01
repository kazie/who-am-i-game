<script setup lang="ts">
import { computed, ref } from 'vue'
import { isRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '../game/ids'
import { LIMITS } from '../game/protocol'

const props = defineProps<{
  /** When set, only the name is asked for. */
  code?: string
}>()
const emit = defineEmits<{ join: [{ code: string; name: string }] }>()

const codeInput = ref(props.code ?? '')
const name = ref('')
const normalizedCode = computed(() => normalizeRoomCode(codeInput.value))
const valid = computed(() => isRoomCode(normalizedCode.value) && name.value.trim())

function join() {
  if (valid.value) emit('join', { code: normalizedCode.value, name: name.value.trim() })
}
</script>

<template>
  <form class="panel stack" @submit.prevent="join">
    <h2>{{ props.code ? `Join room ${props.code}` : 'Join a game' }}</h2>
    <label v-if="!props.code">
      Room code
      <input
        v-model="codeInput"
        :maxlength="ROOM_CODE_LENGTH + 2"
        placeholder="ABCDE"
        autocapitalize="characters"
        class="code"
        required
      />
    </label>
    <label>
      Your name
      <input v-model="name" :maxlength="LIMITS.name" autocomplete="nickname" required />
    </label>
    <button class="primary" type="submit" :disabled="!valid">Join</button>
  </form>
</template>

<style scoped>
.code {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-family: ui-monospace, monospace;
}
</style>
