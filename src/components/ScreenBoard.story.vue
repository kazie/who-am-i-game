<script setup lang="ts">
import {
  finishedState,
  lobbyState,
  overState,
  playingState,
  votingState,
  writingState,
  exampleJoinUrl,
  exampleSite,
} from '../fixtures'
import ScreenBoard from './ScreenBoard.vue'

const variants = [
  ['Lobby', lobbyState],
  ['Writing', writingState],
  ["Chen's turn", playingState],
  ["Voting on Chen's guess", votingState],
  ['Round over', finishedState],
  ['Game over', overState],
] as const
</script>

<template>
  <Story title="ScreenBoard (presentation screen)" :layout="{ type: 'single', iframe: false }">
    <Variant v-for="[title, state] in variants" :key="title" :title="title">
      <ScreenBoard :state="state" :join-url="exampleJoinUrl" :site-url="exampleSite" />
    </Variant>
  </Story>
</template>
