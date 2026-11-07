<script setup lang="ts">
import { soloLobby, variant } from '../example/roomStates.stories'
import { lobbyState, packLobbyState, writingState } from '../fixtures'
import RoomScreen from './RoomScreen.vue'

/** Waiting for everyone, then writing the cards. */
const variants = [
  variant('Lobby, my tab relays', lobbyState, 'p1'),
  variant('Lobby, my tab relays and nobody could take over', soloLobby, 'p1'),
  variant('Lobby, as a player', lobbyState, 'p2'),
  variant('Lobby, ready-made pack', packLobbyState, 'p2'),
  variant('Writing, before sending', writingState, 'p2'),
  variant('Writing, entry sent', writingState, 'p1'),
]
</script>

<template>
  <Story title="Room/RoomScreen/Lobby and writing">
    <Variant v-for="v in variants" :key="v.title" :title="v.title" :source="v.source">
      <div class="page">
        <RoomScreen v-bind="v.props" />
      </div>
    </Variant>
  </Story>
</template>
