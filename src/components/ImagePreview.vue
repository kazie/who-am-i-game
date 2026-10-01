<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ src?: string; alt: string; loading?: boolean }>()

const failed = ref(false)
watch(
  () => props.src,
  () => (failed.value = false),
)
</script>

<template>
  <div class="frame">
    <span v-if="loading" class="muted small">Looking for a picture…</span>
    <img
      v-else-if="src && !failed"
      :src="src"
      :alt="alt"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else class="placeholder" aria-hidden="true">🖼️</span>
    <span v-if="!loading && src && failed" class="muted small error"
      >Picture could not be loaded</span
    >
  </div>
</template>

<style scoped>
.frame {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  overflow: hidden;
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.placeholder {
  font-size: 2.5rem;
  opacity: 0.5;
}
.error {
  position: absolute;
  bottom: 8px;
}
</style>
