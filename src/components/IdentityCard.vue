<script setup lang="ts">
import type { Entry } from '../game/protocol'
import ImagePreview from './ImagePreview.vue'

defineProps<{
  playerName: string
  entry?: Entry
  /** Written by. */
  authorName?: string
  /** This is the viewer's own card and must stay secret. */
  hidden: boolean
  isMe?: boolean
  solved?: boolean
  away?: boolean
  /** Their turn to ask questions. */
  turn?: boolean
  guessing?: boolean
}>()
</script>

<template>
  <article class="card" :class="{ me: isMe, away, turn }">
    <header class="row">
      <strong>{{ playerName }}{{ isMe ? ' (you)' : '' }}</strong>
      <span v-if="guessing" class="badge turn">Guessing…</span>
      <span v-else-if="turn" class="badge turn">🎤 Asking</span>
      <span v-if="solved" class="badge ok">Solved</span>
      <span v-if="away" class="badge">Away</span>
    </header>
    <div v-if="hidden" class="secret" aria-label="Your identity is hidden">
      <span>❓</span>
      <p>Who am I?</p>
    </div>
    <template v-else-if="entry">
      <ImagePreview :src="entry.imageUrl" :alt="entry.label" />
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
    </template>
    <p v-else class="muted">No identity</p>
    <footer v-if="authorName && !hidden" class="muted small">Written by {{ authorName }}</footer>
  </article>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card.me {
  border-color: var(--accent);
  border-width: 2px;
}
.card.away {
  opacity: 0.6;
}
header {
  justify-content: space-between;
}
.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.card.turn {
  box-shadow:
    0 0 0 3px var(--accent),
    var(--shadow);
}
.badge.turn {
  color: var(--accent);
  border-color: var(--accent);
}
.badge.ok {
  color: var(--ok);
  border-color: var(--ok);
}
.secret {
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  background: repeating-linear-gradient(
    45deg,
    var(--surface-2),
    var(--surface-2) 10px,
    var(--surface) 10px,
    var(--surface) 20px
  );
  display: grid;
  place-content: center;
  text-align: center;
}
.secret span {
  font-size: 3rem;
}
.secret p {
  margin: 0;
  font-weight: 700;
}
.label {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}
</style>
