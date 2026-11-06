<script setup lang="ts">
import { computed } from 'vue'
import { tilt } from './tilt'

/**
 * The game's one recurring shape (DESIGN.md): a header line with a red rule under it, and a
 * body with faint blue rules. The look lives in style.css (`.index-card`).
 */
const props = withDefaults(
  defineProps<{
    /** Lays the card a little crooked, always the same way for the same seed. */
    seed?: string
    /** The card's own element, e.g. `li` in a list. */
    as?: string
    /** The header's element, e.g. `h3` when the card is a section with a title. */
    headAs?: string
    /** Draw the blue rules on the body. */
    ruled?: boolean
  }>(),
  { seed: undefined, as: 'article', headAs: 'header', ruled: true },
)

const style = computed(() => (props.seed ? { '--tilt': tilt(props.seed) } : undefined))
</script>

<template>
  <component :is="as" class="index-card" :style="style">
    <component :is="headAs" class="head"><slot name="head" /></component>
    <div :class="ruled ? 'ruled' : 'body'"><slot /></div>
    <slot name="foot" />
  </component>
</template>
