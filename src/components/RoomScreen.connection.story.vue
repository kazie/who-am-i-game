<script setup lang="ts">
import { relayOnChen, variant } from '../example/roomStates.stories'
import { playingState } from '../fixtures'
import RoomScreen from './RoomScreen.vue'

/** The banners over a game in progress when the connection or the relay has trouble. */
const variants = [
  variant('Lost connection', playingState, 'p1', { connection: 'connecting' }),
  variant("Relay's tab gone", playingState, 'p2', { hostAlive: false }),
  variant('Relay switched', relayOnChen, 'p2', { relayChanged: true }),
]
</script>

<template>
  <Story title="Room/RoomScreen/Connection trouble">
    <Variant v-for="v in variants" :key="v.title" :title="v.title" :source="v.source">
      <div class="page">
        <RoomScreen v-bind="v.props" />
      </div>
    </Variant>
  </Story>
</template>
