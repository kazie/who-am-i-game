<script setup lang="ts">
import { computed } from 'vue'
import { qrModules } from './qr'

/** A QR code for `url`, to scan with a phone camera. */
const props = withDefaults(defineProps<{ url: string; size?: number }>(), { size: 140 })

const qr = computed(() => {
  const data = qrModules(props.url)
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
    .join('')
  return { path, cells: data.length }
})
</script>

<template>
  <svg
    class="qr"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${qr.cells} ${qr.cells}`"
    shape-rendering="crispEdges"
    role="img"
    :aria-label="`QR code for ${url}`"
  >
    <!-- Always dark on white: many phone cameras can't read an inverted code. -->
    <rect :width="qr.cells" :height="qr.cells" fill="#fff" />
    <path :d="qr.path" fill="#000" />
  </svg>
</template>

<style scoped>
.qr {
  display: block;
  border-radius: 8px;
}
</style>
