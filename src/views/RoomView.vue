<script setup lang="ts">
import { onScopeDispose } from 'vue'
import { useRouter } from 'vue-router'
import { getBridge } from '../bridge/BridgeClient'
import BadRoomCode from '../components/BadRoomCode.vue'
import RoomScreen from '../components/RoomScreen.vue'
import { isRoomCode, normalizeRoomCode } from '../game/ids'
import { getSeatGuard } from '../game/seats'
import { browserStorage } from '../game/storage'
import { useAlerts, vibrate, webAudioBeeper } from '../game/useAlerts'
import { notesKey, useNotes } from '../game/useNotes'
import { useWakeLock } from '../game/useWakeLock'
import { joinRoom, useRoom } from '../game/useRoom'

const props = defineProps<{ code: string }>()
const router = useRouter()

// A link with a code that can't exist never touches the network.
const code = normalizeRoomCode(props.code)
const room = isRoomCode(code)
  ? useRoom(code, { bridge: getBridge(), storage: browserStorage(), seats: getSeatGuard() })
  : null

// Only real rooms make noise: the example game and the stories reuse RoomScreen silently.
const beeper = webAudioBeeper()
onScopeDispose(beeper.dispose)
const alerts =
  room &&
  useAlerts(room.state, () => room.me.value?.id, {
    storage: browserStorage('localStorage'),
    document,
    beep: beeper.beep,
    vibrate,
  })

// Private notes about your own card, one list per round, kept in this tab only.
const notes =
  room &&
  useNotes(browserStorage(), () =>
    room.state.value && room.me.value ? notesKey(code, room.state.value.round) : null,
  )

// Keep the screen on: always for the relay (a sleeping relay stalls the room until
// another tab takes over), and for everyone while the cards are out.
useWakeLock(() => {
  const s = room?.state.value
  if (!room || !s || s.closed || s.phase === 'over') return false
  return room.isRelay.value || s.phase === 'playing'
})

function switchRoom({ code, name }: { code: string; name: string }) {
  joinRoom(code, name, browserStorage())
  router.push({ name: 'room', params: { code } })
}
</script>

<template>
  <RoomScreen
    v-if="room"
    :room="room"
    :alerts="alerts ?? undefined"
    :notes="notes ?? undefined"
    @leave="router.push('/')"
  />
  <BadRoomCode v-else :code="code" @join="switchRoom" />
</template>
