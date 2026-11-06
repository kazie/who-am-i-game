<script setup lang="ts">
/**
 * The few icons the game needs, drawn in one stroke style. Always decorative: put the
 * meaning in text (or an aria-label) next to it.
 */
export type IconName = 'mic' | 'relay' | 'bell' | 'bell-off' | 'screen' | 'check' | 'x'

defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'mic'">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </template>
    <template v-else-if="name === 'relay'">
      <circle cx="12" cy="12" r="1.75" />
      <path d="M8.8 15.2a4.5 4.5 0 0 1 0-6.4M15.2 8.8a4.5 4.5 0 0 1 0 6.4" />
      <path d="M6 18a8.5 8.5 0 0 1 0-12M18 6a8.5 8.5 0 0 1 0 12" />
    </template>
    <template v-else-if="name === 'bell' || name === 'bell-off'">
      <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" />
      <path d="M10 21h4" />
      <path v-if="name === 'bell-off'" d="M3.5 3.5l17 17" />
    </template>
    <template v-else-if="name === 'screen'">
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M8.5 20h7M12 16v4" />
    </template>
    <path v-else-if="name === 'check'" d="M5 12.5l4.5 4.5L19 7" />
    <path v-else-if="name === 'x'" d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
</template>

<style scoped>
.icon {
  width: 1.1em;
  height: 1.1em;
  vertical-align: -0.18em;
  flex: none;
}
</style>
