<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { GameState } from '../game/protocol'
import {
  activePlayers,
  beforeDeal,
  finishTally,
  identityOf,
  playerById,
  roundEnded,
  tally,
  turnCountLabel,
  turnsOf,
  winnerNames,
  winners,
} from '../game/reducer'
import AppIcon from './AppIcon.vue'
import IdentityCard from './IdentityCard.vue'
import IndexCard from './IndexCard.vue'
import JoinQr from './JoinQr.vue'
import ScoreBoard from './ScoreBoard.vue'

/**
 * The shared "main screen" for a TV or a screen share. Everyone can see it, the
 * players whose cards these are included, so it never shows an unsolved identity.
 */
const props = defineProps<{
  state: GameState
  /** The room's own link: the QR code opens it straight away. */
  joinUrl?: string
  /** Where the game is hosted, for anyone typing it in by hand. */
  siteUrl?: string
}>()

const siteLabel = computed(() => props.siteUrl?.replace(/^https?:\/\/|\/$/g, ''))

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
      authorName: s.value.pack ? undefined : identity?.author.name,
      turn: s.value.phase === 'playing' && s.value.turn === p.id,
      guessing: s.value.guess?.playerId === p.id,
      turns: turnsOf(s.value, p.id),
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
        <JoinQr v-if="joinUrl" :url="joinUrl" :size="s.phase === 'lobby' ? 220 : undefined" />
        <div class="join-text">
          <p class="muted">{{ joinUrl ? 'Scan to join, or go to' : 'Join with code' }}</p>
          <p v-if="siteLabel" class="site">{{ siteLabel }}</p>
          <p v-if="siteLabel" class="muted">and enter the code</p>
          <p class="room-code code">{{ s.code }}</p>
        </div>
      </div>
    </header>

    <div class="layout">
      <section class="stack">
        <!-- Always there, so every change of phase, turn and vote is read out. -->
        <div class="stack" aria-live="polite">
          <template v-if="beforeDeal(s)">
            <h2 class="headline">
              {{ s.phase === 'lobby' ? 'Waiting for players…' : 'Everyone writes one' }}
            </h2>
            <p v-if="s.pack" class="muted">Ready-made cards from a pack: nobody needs to write.</p>
          </template>

          <div v-else-if="s.phase === 'playing' && votes" class="callout now headline-box">
            <h2 class="headline">{{ guesser?.name }} is guessing…</h2>
            <p class="tally">
              <span class="yes">{{ votes.yes }} yes</span> ·
              <span class="no">{{ votes.no }} no</span>
              <span class="muted"> · {{ votes.needed }} of {{ votes.eligible }} needed</span>
            </p>
          </div>

          <div v-else-if="s.phase === 'playing' && turnPlayer" class="callout now headline-box">
            <h2 class="headline">
              <AppIcon name="mic" class="mic" /> {{ turnPlayer.name }}'s turn
            </h2>
            <p class="muted">
              Ask a yes/no question, or make a guess. ·
              {{ turnCountLabel(s, turnPlayer.id) }}
            </p>
          </div>

          <template v-else-if="s.phase === 'finished'">
            <h2 class="headline">Round {{ s.round }} is over</h2>
            <p class="muted">
              Play another round, or finish the game: {{ finishing.votes }} of
              {{ finishing.needed }} votes to finish.
            </p>
          </template>

          <div v-else-if="s.phase === 'over'" class="callout now headline-box">
            <p class="muted">The winner{{ winnerCount > 1 ? 's are' : ' is' }}</p>
            <h2 class="headline">{{ winnerNames(s) }}</h2>
          </div>
        </div>

        <ul v-if="beforeDeal(s)" class="names">
          <IndexCard
            v-for="p in players"
            :key="p.id"
            as="li"
            head-as="span"
            :seed="p.name"
            class="name-card"
          >
            <template #head>{{ p.name }}</template>
            <span class="state" :class="{ sent: p.entry }">
              <template v-if="s.phase === 'lobby'">here</template>
              <template v-else-if="p.entry"><AppIcon name="check" /> sent</template>
              <template v-else>writing…</template>
            </span>
          </IndexCard>
        </ul>

        <section v-else class="card-grid">
          <IdentityCard
            v-for="c in cards"
            :key="c.player.id"
            :player-name="c.player.name"
            :entry="c.entry"
            :author-name="c.authorName"
            :hidden="!c.entry"
            :solved="c.player.solved"
            :turn="c.turn"
            :guessing="c.guessing"
            :turns="c.turns"
          />
        </section>
      </section>

      <aside class="panel stack">
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
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  align-items: center;
  gap: 12px 20px;
  text-align: right;
}
@media (max-width: 600px) {
  .join {
    justify-content: start;
    text-align: left;
  }
}
.site {
  font-size: clamp(1.25rem, 3vw, 2rem);
  font-weight: 700;
  word-break: break-all;
}
.code {
  font-size: clamp(2rem, 5vw, 3.5rem);
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
}
.headline .mic {
  color: var(--accent);
}
.headline-box {
  padding: 24px;
}
.tally {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}
.tally .yes {
  color: var(--ok);
  font-weight: 700;
}
.tally .no {
  font-weight: 700;
}
.names {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 1.4rem;
}
.name-card {
  min-width: 9em;
}
.state {
  font-family: var(--font-typed);
  font-size: 0.7em;
  color: var(--muted);
}
.state.sent {
  color: var(--ok);
}
</style>
