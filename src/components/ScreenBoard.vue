<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { GameState } from '../game/protocol'
import {
  activePlayers,
  finishTally,
  identityOf,
  playerById,
  roundEnded,
  tally,
  winnerNames,
  winners,
} from '../game/reducer'
import IdentityCard from './IdentityCard.vue'
import ScoreBoard from './ScoreBoard.vue'

/**
 * The shared "main screen" for a TV or a screen share. Everyone can see it, the
 * players whose cards these are included, so it never shows an unsolved identity.
 */
const props = defineProps<{ state: GameState; joinUrl?: string }>()

const s = toRef(props, 'state')
const players = computed(() => activePlayers(s.value))
const turnPlayer = computed(() => playerById(s.value, s.value.turn))
const guesser = computed(() => playerById(s.value, s.value.guess?.playerId))
const votes = computed(() => tally(s.value))
const finishing = computed(() => finishTally(s.value))
const winnerCount = computed(() => winners(s.value).length)

// Unsolved cards stay off this screen until the round is over: entry is only set if shown.
const cards = computed(() =>
  players.value.map((p) => {
    const identity = p.solved || roundEnded(s.value) ? identityOf(s.value, p.id) : undefined
    return {
      player: p,
      entry: identity?.entry,
      authorName: identity?.author.name,
      turn: s.value.phase === 'playing' && s.value.turn === p.id,
    }
  }),
)
</script>

<template>
  <div class="screen">
    <header class="top">
      <div>
        <p class="muted">Round {{ s.round }} · Theme</p>
        <h1>{{ s.theme }}</h1>
      </div>
      <div class="join">
        <p class="muted">Join with code</p>
        <p class="code">{{ s.code }}</p>
        <p v-if="joinUrl" class="muted small url">{{ joinUrl }}</p>
      </div>
    </header>

    <div class="layout">
      <main class="stack">
        <template v-if="s.phase === 'lobby' || s.phase === 'writing'">
          <h2 class="headline">
            {{ s.phase === 'lobby' ? 'Waiting for players…' : 'Everyone writes one ✍️' }}
          </h2>
          <ul class="names">
            <li v-for="p in players" :key="p.id">
              <template v-if="s.phase === 'writing'">{{ p.entry ? '✅' : '✍️' }}</template>
              {{ p.name }}
            </li>
          </ul>
        </template>

        <template v-else-if="s.phase === 'playing'">
          <div v-if="s.guess && votes" class="headline-box guessing">
            <h2 class="headline">{{ guesser?.name }} is guessing…</h2>
            <p class="tally">
              ✅ {{ votes.yes }} &nbsp; ❌ {{ votes.no }}
              <span class="muted">· {{ votes.needed }} of {{ votes.eligible }} needed</span>
            </p>
          </div>
          <div v-else-if="turnPlayer" class="headline-box">
            <h2 class="headline">🎤 {{ turnPlayer.name }}'s turn</h2>
            <p class="muted">Ask a yes/no question, or make a guess.</p>
          </div>
        </template>

        <template v-else-if="s.phase === 'finished'">
          <h2 class="headline">Round {{ s.round }} is over</h2>
          <p class="muted">
            Play another round, or finish the game: {{ finishing.votes }} of
            {{ finishing.needed }} votes to finish.
          </p>
        </template>

        <div v-else class="headline-box winner">
          <p class="muted">The winner{{ winnerCount > 1 ? 's are' : ' is' }}</p>
          <h2 class="headline">🏆 {{ winnerNames(s) }}</h2>
        </div>

        <section v-if="s.phase !== 'lobby' && s.phase !== 'writing'" class="cards">
          <template v-for="c in cards" :key="c.player.id">
            <IdentityCard
              v-if="c.entry"
              :player-name="c.player.name"
              :entry="c.entry"
              :author-name="c.authorName"
              :hidden="false"
              :solved="c.player.solved"
              :turn="c.turn"
            />
            <article v-else class="unsolved" :class="{ turn: c.turn }">
              <strong>{{ c.player.name }}</strong>
              <span class="q">❓</span>
              <span class="muted">still guessing</span>
            </article>
          </template>
        </section>
      </main>

      <aside class="stack">
        <h3>Points</h3>
        <ScoreBoard :state="s" large />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.screen {
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-size: 1.15rem;
}
.top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}
.top p,
.top h1 {
  margin: 0;
}
.top h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
}
.join {
  text-align: right;
}
.code {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  letter-spacing: 0.15em;
}
.url {
  word-break: break-all;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 340px);
  gap: 32px;
  align-items: start;
}
@media (max-width: 800px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
.headline {
  font-size: clamp(2rem, 6vw, 4rem);
  margin: 0;
}
.headline-box {
  padding: 24px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 2px solid var(--accent);
}
.headline-box.winner {
  text-align: center;
}
.tally {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  margin: 8px 0 0;
}
.names {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 1.5rem;
}
.names li {
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--surface-2);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.unsolved {
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 200px;
}
.unsolved.turn {
  border: 3px solid var(--accent);
}
.unsolved .q {
  font-size: 3rem;
}
</style>
