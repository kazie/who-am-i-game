<script setup lang="ts">
import type { Entry } from '../game/protocol'
import { turnsLabel } from '../game/reducer'
import AppIcon from './AppIcon.vue'
import ImagePreview from './ImagePreview.vue'
import IndexCard from './IndexCard.vue'

defineProps<{
  playerName: string
  entry?: Entry
  /** Written by. */
  authorName?: string
  /**
   * Nothing written on it shows: the viewer's own card (`isMe`), or someone's unsolved
   * card on the shared screen.
   */
  hidden: boolean
  isMe?: boolean
  solved?: boolean
  away?: boolean
  /** Their turn to ask questions. */
  turn?: boolean
  guessing?: boolean
  /** How many turns it took to guess, shown on solved cards. */
  turns?: number
}>()
</script>

<template>
  <IndexCard :seed="playerName" :class="{ me: isMe, flat: away, lifted: turn || guessing }">
    <template #head>
      <span class="who">{{ playerName }}</span>
      <span v-if="isMe" class="you">(you)</span>
      <span v-if="guessing" class="status now">Guessing</span>
      <span v-else-if="turn" class="status now"><AppIcon name="mic" /> Asking</span>
      <span v-if="away" class="status">Away</span>
    </template>
    <template v-if="hidden">
      <p class="unknown" aria-hidden="true">???</p>
      <p class="note">
        <span class="sr-only">Hidden card. </span>
        {{ isMe ? 'Who am I?' : 'still guessing' }}
      </p>
    </template>
    <template v-else-if="entry">
      <p class="label">
        <a
          v-if="entry.sourceUrl"
          :href="entry.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          >{{ entry.label }}</a
        >
        <template v-else>{{ entry.label }}</template>
      </p>
      <ImagePreview class="photo" :src="entry.imageUrl" :alt="entry.label" />
    </template>
    <p v-else class="note">No identity</p>
    <p v-if="solved && !hidden" class="stamp">
      Solved<template v-if="turns"> in {{ turnsLabel(turns) }}</template>
    </p>
    <template v-if="!hidden && authorName" #foot>
      <footer class="by muted small">Written by {{ authorName }}</footer>
    </template>
  </IndexCard>
</template>

<style scoped>
.flat .photo {
  opacity: 0.5;
}
.who {
  overflow-wrap: anywhere;
}
.me .who {
  color: var(--accent);
}
.you,
.status {
  font-family: var(--font-text);
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.8em;
  color: var(--muted);
}
.status {
  margin-left: auto;
}
.status.now {
  color: var(--accent);
  font-weight: 700;
}
.status + .status {
  margin-left: 0;
}
.label {
  font-family: var(--font-typed);
  font-weight: 700;
  font-size: 1.15em;
  overflow-wrap: anywhere;
}
.label a {
  color: inherit;
  text-decoration-color: var(--rule-red);
}
/* A print laid on the card. */
.ruled .photo {
  margin: 4px 0 6px;
  border: 4px solid var(--card);
  outline: 1px solid var(--border);
}
.unknown {
  font-family: var(--font-typed);
  font-weight: 700;
  font-size: 2.6em;
  /* Three ruled lines tall (lh in line-height means the parent's line). */
  line-height: 3lh;
  text-align: center;
  letter-spacing: 0.1em;
  color: var(--muted);
}
.note {
  text-align: center;
  font-family: var(--font-typed);
  color: var(--muted);
}
.ruled .stamp {
  margin-top: 4px;
  line-height: 1.6;
  border-width: 2px;
  color: var(--ok);
  font-family: var(--font-typed);
  font-size: 0.9em;
  transform: rotate(-3deg);
}
.by {
  padding: 0 12px 8px;
}
</style>
