<script setup lang="ts">
import { finishedState, lobbyState, overState, playingState } from '../fixtures'
import ScoreBoard from './ScoreBoard.vue'
</script>

<template>
  <Story title="ScoreBoard" :layout="{ type: 'grid', width: 320 }">
    <Variant title="No points yet">
      <ScoreBoard :state="lobbyState" me-id="p1" />
    </Variant>
    <Variant title="During round 2">
      <ScoreBoard :state="playingState" me-id="p1" />
    </Variant>
    <Variant title="Round over (tie for first)">
      <ScoreBoard :state="finishedState" me-id="p3" />
    </Variant>
    <Variant title="Game over">
      <ScoreBoard :state="overState" />
    </Variant>
    <Variant title="Large (TV)">
      <ScoreBoard :state="playingState" large />
    </Variant>
  </Story>
</template>
