<script setup lang="ts">
import { useRouter } from 'vue-router'
import { getBridge } from '../bridge/BridgeClient'
import BadRoomCode from '../components/BadRoomCode.vue'
import RoomScreen from '../components/RoomScreen.vue'
import { isRoomCode, normalizeRoomCode } from '../game/ids'
import { getSeatGuard } from '../game/seats'
import { browserStorage } from '../game/storage'
import { joinRoom, useRoom } from '../game/useRoom'

const props = defineProps<{ code: string }>()
const router = useRouter()

// A link with a code that can't exist never touches the network.
const code = normalizeRoomCode(props.code)
const room = isRoomCode(code)
  ? useRoom(code, { bridge: getBridge(), storage: browserStorage(), seats: getSeatGuard() })
  : null

function switchRoom({ code, name }: { code: string; name: string }) {
  joinRoom(code, name, browserStorage())
  router.push({ name: 'room', params: { code } })
}
</script>

<template>
  <RoomScreen v-if="room" :room="room" @leave="router.push('/')" />
  <BadRoomCode v-else :code="code" @join="switchRoom" />
</template>
