<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import type { Entry } from '../game/protocol'
import { LIMITS } from '../game/protocol'
import { classifyImageUrl, resolveImageUrl } from '../game/wikipedia'
import IdentityCard from './IdentityCard.vue'
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
/** Where the pasted link's picture stands: one step at a time. */
type Picture =
  /** Nothing to look up, or the article has no picture. */
  | { step: 'none' }
  | { step: 'resolving' }
  /** Wikipedia couldn't be reached, so we don't know whether there is a picture. */
  | { step: 'lookupFailed' }
  /** Found; then it loads in this browser, or doesn't. */
  | { step: 'loading' | 'loaded' | 'broken'; url: string }
const pic = ref<Picture>({ step: 'none' })
/** The resolved picture link, whether or not it has loaded yet. */
const url = computed(() => ('url' in pic.value ? pic.value.url : undefined))
/** The picture that would be sent: only one that has loaded here. */
const picture = computed(() => (pic.value.step === 'loaded' ? pic.value.url : undefined))
/** Bumped to load a broken picture again from scratch. */
const attempt = ref(0)
const confirmNoImage = ref(false)
const hintId = useId()

/** The browser answered for a picture that is still the one being shown. */
function settle(src: string, step: 'loaded' | 'broken') {
  if (pic.value.step === 'loading' && pic.value.url === src) pic.value = { step, url: src }
}

const source = computed(() => classifyImageUrl(link.value))
const linkHint = computed(() => {
  if (tooLong.value) return 'That picture link is too long. Try a different picture.'
  switch (pic.value.step) {
    case 'broken':
      return "That link didn't load as a picture. Try again, or try a different one."
    case 'lookupFailed':
      return "Couldn't reach Wikipedia to look for the picture. Check your connection, or paste a direct image link."
  }
  switch (source.value.kind) {
    case 'article':
      switch (pic.value.step) {
        case 'resolving':
          return 'Wikipedia article: looking up its main picture…'
        case 'loading':
          return 'Wikipedia article: loading its main picture…'
        case 'loaded':
          return 'Wikipedia article: using its main picture.'
        default:
          return 'That article has no picture. Try clicking a picture on the page and pasting that link.'
      }
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
/** Looks the pasted link's picture up again, after a short pause for typing. */
function lookUp(delay = props.debounceMs) {
  const { kind } = source.value
  const value = link.value
  clearTimeout(timer)
  confirmNoImage.value = false
  const id = ++request
  if (kind === 'empty' || kind === 'invalid') {
    pic.value = { step: 'none' }
    return
  }
  pic.value = { step: 'resolving' }
  timer = setTimeout(async () => {
    let next: Picture
    try {
      const found = await props.resolve(value)
      next = found ? { step: 'loading', url: found } : { step: 'none' }
    } catch {
      next = { step: 'lookupFailed' }
    }
    if (id === request) pic.value = next
  }, delay)
}
watch(source, () => lookUp(), { immediate: true })
// No lookups for a form that's gone: cancel the pending one, ignore one in flight.
onBeforeUnmount(() => {
  clearTimeout(timer)
  request++
})

/** Try again: the lookup if that failed, or just the picture if it didn't load. */
function retry() {
  if (pic.value.step === 'broken') {
    pic.value = { step: 'loading', url: pic.value.url }
    attempt.value++
  } else lookUp(0)
}

// The relay rejects longer links, and would drop the whole entry without a word.
const tooLong = computed(
  () => link.value.trim().length > LIMITS.url || (url.value?.length ?? 0) > LIMITS.url,
)
// Wait for the picture before sending, so a link that doesn't work isn't sent.
const canSubmit = computed(
  () =>
    label.value.trim().length > 0 &&
    pic.value.step !== 'resolving' &&
    pic.value.step !== 'loading' &&
    source.value.kind !== 'invalid' &&
    !tooLong.value,
)

function submit() {
  if (!canSubmit.value) return
  // Pictures are optional, but strongly encouraged: ask once.
  if (!picture.value && !confirmNoImage.value) {
    confirmNoImage.value = true
    return
  }
  emit('submit', {
    label: label.value.trim(),
    ...(picture.value ? { imageUrl: picture.value, sourceUrl: link.value.trim() } : {}),
  })
}
</script>

<template>
  <div v-if="submitted" class="panel stack">
    <h2>Your entry is in</h2>
    <IdentityCard class="locked" player-name="Your entry" :entry="submitted" :hidden="false" />
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
    <div class="stack tight">
      <label>
        Picture link (optional, but please add one)
        <input
          v-model="link"
          type="url"
          inputmode="url"
          :maxlength="LIMITS.url"
          placeholder="https://en.wikipedia.org/wiki/Marie_Curie"
          :aria-describedby="hintId"
        />
      </label>
      <p :id="hintId" class="muted small">
        {{ linkHint }}
        <button
          v-if="pic.step === 'broken' || pic.step === 'lookupFailed'"
          type="button"
          class="chip"
          @click="retry"
        >
          Try again
        </button>
      </p>
    </div>
    <ImagePreview
      v-if="link.trim()"
      :key="attempt"
      :src="url"
      :alt="label"
      :loading="pic.step === 'resolving'"
      @load="(src) => settle(src, 'loaded')"
      @error="(src) => settle(src, 'broken')"
    />
    <p v-if="confirmNoImage" class="banner warn small">
      No picture yet. Cards are much more fun with one. Press Send again to continue without it.
    </p>
    <button class="primary" type="submit" :disabled="!canSubmit">Send</button>
  </form>
</template>

<style scoped>
.locked {
  max-width: 280px;
}
</style>
