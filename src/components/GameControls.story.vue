<script setup lang="ts">
import { logEvent } from 'histoire/client'
import { finishedState, lobbyState, playingState, writingState } from '../fixtures'
import GameControls from './GameControls.vue'

const states = {
  lobby: lobbyState,
  'writing (waiting for Bob)': writingState,
  playing: playingState,
  'playing (Alice voted to end)': { ...playingState, endVotes: ['p1'] },
  finished: finishedState,
}
</script>

<template>
  <Story title="GameControls" :layout="{ type: 'grid', width: 300 }">
    <Variant v-for="(state, title) in states" :key="title" :title="title">
      <GameControls
        :state="state"
        me-id="p1"
        @start-writing="logEvent('startWriting', {})"
        @deal="logEvent('deal', {})"
        @vote-to-end="logEvent('voteToEnd', { end: $event })"
        @new-round="logEvent('newRound', { theme: $event })"
      />
    </Variant>
  </Story>
</template>
