<script setup lang="ts">
import { effectScope, onScopeDispose } from 'vue'
import { MemoryHub } from '../bridge/MemoryBridge'
import { entries } from '../fixtures'
import { memoryStorage } from '../game/storage'
import { hostRoom, useRoom, type Room } from '../game/useRoom'
import { useScreen } from '../game/useScreen'
import RoomScreen from './RoomScreen.vue'
import ScreenBoard from './ScreenBoard.vue'

/**
 * A whole game in one page: the room creator, two players and a presentation screen talk
 * over an in-memory bridge, so every button works without the eventbridge server running.
 */
const CODE = 'K7QXP'
const hub = new MemoryHub()
const scope = effectScope()
onScopeDispose(() => scope.stop())

function seat(storage = memoryStorage()) {
  return scope.run(() => useRoom(CODE, { bridge: hub.createClient(), storage }))!
}

const hostStorage = memoryStorage()
hostRoom({ code: CODE, theme: 'Big cats', name: 'Alice' }, { storage: hostStorage })
const host = seat(hostStorage)
const bob = seat()
const chen = seat()
bob.join('Bob')
chen.join('Chen')

const screen = scope.run(() => useScreen(CODE, { bridge: hub.createClient() }))!

const resolveImage = async (url: string) =>
  url.includes('wikipedia.org/wiki/') ? entries.lion.imageUrl : url

const seats: [string, Room][] = [
  ['Alice (created the room)', host],
  ['Bob', bob],
  ['Chen', chen],
]
</script>

<template>
  <Story title="RoomScreen (live, in-memory)" :layout="{ type: 'single', iframe: false }">
    <Variant v-for="[title, room] in seats" :key="title" :title="title">
      <div class="page">
        <RoomScreen :room="room" :resolve-image="resolveImage" />
      </div>
    </Variant>
    <Variant title="📺 Presentation screen">
      <div class="page">
        <ScreenBoard v-if="screen.state.value" :state="screen.state.value" />
      </div>
    </Variant>
  </Story>
</template>
