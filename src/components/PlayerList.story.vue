<script setup lang="ts">
import { logEvent } from 'histoire/client'
import { lobbyState, playingState, writingState } from '../fixtures'
import PlayerList from './PlayerList.vue'
</script>

<template>
  <Story title="PlayerList" :layout="{ type: 'grid', width: 300 }">
    <Variant title="Lobby">
      <PlayerList :state="lobbyState" me-id="p1" @kick="logEvent('kick', $event)" />
    </Variant>
    <!-- Chen has been quiet for a minute, so anyone may remove her. -->
    <Variant title="Writing (Chen is away)">
      <PlayerList :state="writingState" me-id="p2" @kick="logEvent('kick', $event)" />
    </Variant>
    <Variant title="Playing">
      <PlayerList :state="playingState" me-id="p3" />
    </Variant>
  </Story>
</template>
