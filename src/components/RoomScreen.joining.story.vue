<script setup lang="ts">
import { closedLobby, newcomer, variant } from '../example/roomStates.stories'
import { lobbyState, overState } from '../fixtures'
import RoomScreen from './RoomScreen.vue'

/** Before you're in a room, and when you can't be any more. */
const variants = [
  variant('Join form (opened a room link)', null),
  variant('Connecting to the game server', null, 'p9', {
    identity: newcomer,
    connection: 'connecting',
  }),
  variant('Waiting for the room to answer', null, 'p9', { identity: newcomer }),
  variant('Joining (not let in yet)', lobbyState, 'p9', { identity: newcomer }),
  variant('Removed from the room', lobbyState, 'p9', { identity: newcomer, kicked: true }),
  variant('Room closed', closedLobby, 'p2'),
  variant('Game over, opened afterwards', overState, 'p9', { identity: newcomer }),
]
</script>

<template>
  <Story title="Room/RoomScreen/Joining and leaving">
    <Variant v-for="v in variants" :key="v.title" :title="v.title" :source="v.source">
      <div class="page">
        <RoomScreen v-bind="v.props" />
      </div>
    </Variant>
  </Story>
</template>
