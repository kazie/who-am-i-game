<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Entry } from '../game/protocol'
import { LIMITS } from '../game/protocol'
import { classifyImageUrl, resolveImageUrl } from '../game/wikipedia'
import ImagePreview from './ImagePreview.vue'

const props = withDefaults(
  defineProps<{
    theme: string
    /** The entry already sent: the form is locked. */
    submitted?: Entry
    resolve?: (url: string) => Promise<string | undefined>
    debounceMs?: number
    /** Starting values for the inputs, e.g. to show a filled-in form in a story. */
    initialLabel?: string
    initialLink?: string
  }>(),
  {
    submitted: undefined,
    resolve: (url: string) => resolveImageUrl(url),
    debounceMs: 400,
    initialLabel: '',
    initialLink: '',
  },
)
const emit = defineEmits<{ submit: [Entry] }>()

const label = ref(props.initialLabel)
const link = ref(props.initialLink)
const resolved = ref<string>()
const resolving = ref(false)
const confirmNoImage = ref(false)

const source = computed(() => classifyImageUrl(link.value))
const linkHint = computed(() => {
  if (tooLong.value) return 'That picture link is too long. Try a different picture.'
  switch (source.value.kind) {
    case 'article':
      return resolving.value || resolved.value
        ? 'Wikipedia article: using its main picture.'
        : 'That article has no picture. Try clicking a picture on the page and pasting that link.'
    case 'file':
      return 'Wikipedia/Commons picture.'
    case 'direct':
      return 'Direct image link.'
    case 'invalid':
      return 'That does not look like a link.'
    default:
      return 'Paste a Wikipedia article link, or click a picture on Wikipedia and paste that link. A direct image URL works too.'
  }
})

let timer: ReturnType<typeof setTimeout> | undefined
let request = 0
watch(
  source,
  ({ kind }) => {
    const value = link.value
    clearTimeout(timer)
    confirmNoImage.value = false
    resolved.value = undefined
    const id = ++request
    if (kind === 'empty' || kind === 'invalid') {
      resolving.value = false
      return
    }
    resolving.value = true
    timer = setTimeout(async () => {
      const url = await props.resolve(value)
      if (id !== request) return
      resolved.value = url
      resolving.value = false
    }, props.debounceMs)
  },
  { immediate: true },
)

// The relay rejects longer links, and would drop the whole entry without a word.
const tooLong = computed(
  () => link.value.trim().length > LIMITS.url || (resolved.value?.length ?? 0) > LIMITS.url,
)
const canSubmit = computed(
  () =>
    label.value.trim().length > 0 &&
    !resolving.value &&
    source.value.kind !== 'invalid' &&
    !tooLong.value,
)

function submit() {
  if (!canSubmit.value) return
  // Pictures are optional, but strongly encouraged: ask once.
  if (!resolved.value && !confirmNoImage.value) {
    confirmNoImage.value = true
    return
  }
  emit('submit', {
    label: label.value.trim(),
    ...(resolved.value ? { imageUrl: resolved.value, sourceUrl: link.value.trim() } : {}),
  })
}
</script>

<template>
  <div v-if="submitted" class="panel stack">
    <h2>Your entry is in ✅</h2>
    <div class="locked">
      <ImagePreview :src="submitted.imageUrl" :alt="submitted.label" />
      <strong>{{ submitted.label }}</strong>
    </div>
    <p class="muted small">Waiting for everyone else to write theirs…</p>
  </div>

  <form v-else class="panel stack" @submit.prevent="submit">
    <h2>Write one: {{ theme }}</h2>
    <p class="muted small">
      Someone else will have to guess this, so pick something everyone has heard of. You only get
      one entry, and it can't be changed after you send it.
    </p>
    <label>
      Who or what?
      <input v-model="label" :maxlength="LIMITS.label" placeholder="e.g. Marie Curie" required />
    </label>
    <label>
      Picture link (optional, but please add one)
      <input
        v-model="link"
        type="url"
        inputmode="url"
        :maxlength="LIMITS.url"
        placeholder="https://en.wikipedia.org/wiki/Marie_Curie"
      />
      <span class="muted small hint">{{ linkHint }}</span>
    </label>
    <ImagePreview v-if="link.trim()" :src="resolved" :alt="label" :loading="resolving" />
    <p v-if="confirmNoImage" class="banner warn small">
      No picture yet. Cards are much more fun with one. Press Send again to continue without it.
    </p>
    <button class="primary" type="submit" :disabled="!canSubmit">Send</button>
  </form>
</template>

<style scoped>
.locked {
  display: grid;
  gap: 8px;
  max-width: 280px;
}
.hint {
  font-weight: 400;
}
</style>
