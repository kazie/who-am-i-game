<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getBridge } from '../bridge/BridgeClient'
import BadRoomCode from '../components/BadRoomCode.vue'
import RoomStatusBanners from '../components/RoomStatusBanners.vue'
import ScreenBoard from '../components/ScreenBoard.vue'
import { isRoomCode, normalizeRoomCode } from '../game/ids'
import { roomLink, siteUrl } from '../game/links'
import { playerById } from '../game/reducer'
import { useScreen } from '../game/useScreen'

const props = defineProps<{ code: string }>()
const router = useRouter()

const code = normalizeRoomCode(props.code)
const screen = isRoomCode(code) ? useScreen(code, { bridge: getBridge() }) : null
const state = computed(() => screen?.state.value ?? null)
const relayName = computed(
  () => (state.value && playerById(state.value, state.value.hostId)?.name) ?? 'The room creator',
)
// Where the game is hosted, and the room's own link (what the QR code opens). Only for a
// valid code: the router can't build a link for one that normalised to nothing.
const site = siteUrl()
const joinUrl = screen ? roomLink(router, code, site) : undefined
</script>

<template>
  <BadRoomCode
    v-if="!screen"
    :code="code"
    screen
    @open="(c) => router.push({ name: 'screen', params: { code: c } })"
  />
  <template v-else>
    <RoomStatusBanners
      v-if="state"
      :connection="screen.connection.value"
      :host-alive="screen.hostAlive.value"
      :relay-name="relayName"
      :closed="state.closed"
    />
    <ScreenBoard v-if="state" :state="state" :join-url="joinUrl" :site-url="site" />
    <div v-else class="panel stack">
      <h2>Presentation screen for room {{ code }}</h2>
      <p class="muted">
        {{
          screen.connection.value === 'open'
            ? "Waiting for the room creator's tab to answer…"
            : 'Connecting to the game server…'
        }}
      </p>
    </div>
  </template>
</template>
