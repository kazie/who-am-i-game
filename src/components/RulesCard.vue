<script setup lang="ts">
import { useId } from 'vue'
import IndexCard from './IndexCard.vue'

/** The rules in six lines, for first-time players. The one that matters most is in bold. */
defineProps<{
  /** The round's cards come from a ready-made pack, so nobody writes. */
  pack?: boolean
  /** The heading, e.g. "Before you look". */
  title?: string
}>()

const titleId = useId()
</script>

<template>
  <IndexCard as="section" head-as="h3" :ruled="false" class="rules" :aria-labelledby="titleId">
    <template #head
      ><span :id="titleId">{{ title ?? 'How to play' }}</span></template
    >
    <div class="stack">
      <ol class="list">
        <li v-if="pack">The cards come from a ready-made pack and are handed out at random.</li>
        <li v-else>
          Everyone writes one card <strong>for someone else</strong>. The cards are shuffled, so you
          never get the one you wrote.
        </li>
        <li>You can read everyone's card, except your own.</li>
        <li>
          <strong>Never say what's on someone else's card.</strong> That's what they are trying to
          work out.
        </li>
        <li>On your turn, ask one yes/no question about your own card: "Am I an animal?"</li>
        <li>When someone else asks, look at their card and answer only yes or no.</li>
        <li>Think you know? Press "I want to guess", say it out loud, and the others vote.</li>
      </ol>
      <slot />
    </div>
  </IndexCard>
</template>

<style scoped>
.list {
  margin: 0;
  padding-left: 1.4em;
  display: grid;
  gap: 6px;
}
.list strong {
  color: var(--accent);
}
</style>
