<script setup lang="ts">
import { computed, ref } from 'vue'
import { isRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '../game/ids'
import JoinForm from './JoinForm.vue'

/** Shown instead of a room when the link's code can't be a room code. */
const props = defineProps<{
  code: string
  /** Opening a presentation screen: ask only for a code, not a name. */
  screen?: boolean
}>()
const emit = defineEmits<{
  join: [{ code: string; name: string }]
  open: [code: string]
}>()

const codeInput = ref('')
const fixed = computed(() => normalizeRoomCode(codeInput.value))
</script>

<template>
  <div class="stack">
    <p class="banner warn">
      “{{ props.code }}” isn't a valid room code. Room codes have {{ ROOM_CODE_LENGTH }} letters and
      digits, without 0, O, 1, I or L. Check the code and try again.
    </p>
    <form
      v-if="screen"
      class="panel stack"
      @submit.prevent="isRoomCode(fixed) && emit('open', fixed)"
    >
      <label>
        Room code
        <input v-model="codeInput" :maxlength="ROOM_CODE_LENGTH + 2" placeholder="ABCDE" />
      </label>
      <button class="primary" type="submit" :disabled="!isRoomCode(fixed)">
        Open the presentation screen
      </button>
    </form>
    <JoinForm v-else @join="emit('join', $event)" />
  </div>
</template>
