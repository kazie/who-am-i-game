<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{ src?: string; alt: string; loading?: boolean }>()
/** Which picture loaded or failed, so the parent can tell a late answer from a current one. */
const emit = defineEmits<{ load: [src: string]; error: [src: string] }>()

const failed = ref(false)
watch(
  () => props.src,
  () => (failed.value = false),
)

const img = useTemplateRef<HTMLImageElement>('img')
/** Only the picture on screen counts; one that was swapped out may still answer late. */
function answer(e: Event, ok: boolean) {
  if (e.target !== img.value || !props.src) return
  if (ok) return emit('load', props.src)
  failed.value = true
  emit('error', props.src)
}
</script>

<template>
  <div class="frame">
    <span v-if="loading" class="muted small">Looking for a picture…</span>
    <img
      v-else-if="src && !failed"
      ref="img"
      :src="src"
      :alt="alt"
      referrerpolicy="no-referrer"
      @load="answer($event, true)"
      @error="answer($event, false)"
    />
    <span v-else-if="src" class="muted small">Picture could not be loaded</span>
    <span v-else class="muted small">No picture</span>
  </div>
</template>

<style scoped>
.frame {
  aspect-ratio: 4 / 3;
  border-radius: 2px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  text-align: center;
  overflow: hidden;
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
