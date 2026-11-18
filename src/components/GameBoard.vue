<script setup lang="ts">
import { computed, useId } from 'vue'
import type { GameState } from '../game/protocol'
import { activePlayers, cardOf, isAway, turnsOf } from '../game/reducer'
import IdentityCard from './IdentityCard.vue'

const props = defineProps<{
  state: GameState
  meId?: string
  /** Your own card is shown apart (MyCard) while you play, so it's left out here. */
  mineApart?: boolean
}>()

const playing = computed(() => props.state.phase === 'playing')

const titleId = useId()
const title = computed(() => {
  if (!playing.value) return 'All the cards'
  return `${props.mineApart ? 'Their' : "Everyone's"} cards: keep them secret`
})

const cards = computed(() => {
  const s = props.state
  const players = activePlayers(s)
  const others = players.filter((p) => p.id !== props.meId)
  // Your own card first, so you know where you stand, unless it is shown apart.
  const ordered = props.mineApart
    ? others
    : [...players.filter((p) => p.id === props.meId), ...others]
  return ordered.map((p) => {
    const isMe = p.id === props.meId
    return {
      player: p,
      isMe,
      // Your own card stays secret only while the round is being played.
      hidden: isMe && !p.solved && s.phase === 'playing',
      ...cardOf(s, p.id),
      away: isAway(p, s.sentAt),
      turn: s.phase === 'playing' && s.turn === p.id,
      guessing: s.guess?.playerId === p.id,
      turns: turnsOf(s, p.id),
    }
  })
})
</script>

<template>
  <section class="stack board" :aria-labelledby="titleId">
    <div class="stack tight">
      <h2 :id="titleId">{{ title }}</h2>
      <p v-if="playing" class="muted small">
        Nobody can see their own card. Answer their questions with yes or no, and never say what's
        on a card.
      </p>
    </div>
    <div class="card-grid">
      <IdentityCard
        v-for="c in cards"
        :key="c.player.id"
        :player-name="c.player.name"
        :entry="c.entry"
        :author-name="c.authorName"
        :hidden="c.hidden"
        :is-me="c.isMe"
        :solved="c.player.solved"
        :away="c.away"
        :turn="c.turn"
        :guessing="c.guessing"
        :turns="c.turns"
      />
    </div>
  </section>
</template>

<style scoped>
.board {
  gap: 16px;
}
.board h2 {
  font-size: 1.3rem;
}
</style>
