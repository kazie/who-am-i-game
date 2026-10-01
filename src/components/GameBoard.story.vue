<script setup lang="ts">
import { finishedState, playingState, votingState } from '../fixtures'
import GameBoard from './GameBoard.vue'
</script>

<template>
  <Story title="GameBoard">
    <Variant title="Playing, as Alice">
      <GameBoard :state="playingState" me-id="p1" />
    </Variant>
    <Variant title="Playing, as Bob (solved)">
      <GameBoard :state="playingState" me-id="p2" />
    </Variant>
    <Variant title="Chen is guessing">
      <GameBoard :state="votingState" me-id="p1" />
    </Variant>
    <Variant title="Spectator">
      <GameBoard :state="playingState" me-id="p5" />
    </Variant>
    <Variant title="Finished">
      <GameBoard :state="finishedState" me-id="p1" />
    </Variant>
  </Story>
</template>
