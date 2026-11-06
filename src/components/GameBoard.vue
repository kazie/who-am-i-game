<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '../game/protocol'
import { activePlayers, identityOf, isAway, turnsOf } from '../game/reducer'
import IdentityCard from './IdentityCard.vue'

const props = defineProps<{ state: GameState; meId?: string }>()

const cards = computed(() => {
  const s = props.state
  const players = activePlayers(s)
  // Your own card first, so you know where you stand.
  const ordered = [
    ...players.filter((p) => p.id === props.meId),
    ...players.filter((p) => p.id !== props.meId),
  ]
  return ordered.map((p) => {
    const identity = identityOf(s, p.id)
    const isMe = p.id === props.meId
    return {
      player: p,
      isMe,
      // Your own card stays secret only while the round is being played.
      hidden: isMe && !p.solved && s.phase === 'playing',
      entry: identity?.entry,
      authorName: s.pack ? undefined : identity?.author.name,
      away: isAway(p, s.sentAt),
      turn: s.phase === 'playing' && s.turn === p.id,
      guessing: s.guess?.playerId === p.id,
      turns: turnsOf(s, p.id),
    }
  })
})
</script>

<template>
  <section class="card-grid">
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
  </section>
</template>
