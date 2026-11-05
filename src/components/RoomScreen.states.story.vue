<script setup lang="ts">
import { logEvent } from 'histoire/client'
import { staticRoom, type StaticRoomOptions } from '../example/staticRoom'
import {
  finishedState,
  lobbyState,
  overState,
  packLobbyState,
  packPlayingState,
  playingState,
  votingState,
  writingState,
} from '../fixtures'
import { ref } from 'vue'
import type { GameState } from '../game/protocol'
import type { Alerts } from '../game/useAlerts'
import type { Room } from '../game/useRoom'
import RoomScreen from './RoomScreen.vue'

/** Every screen a player can end up on, each frozen at one state. Buttons only log. */
const onAction = (name: string, args: unknown[]) => logEvent(name, { args })
const newcomer = { playerId: 'p9', name: 'Zoe' }
const at = (state: GameState | null, meId?: string, opts: StaticRoomOptions = {}) =>
  staticRoom(state, meId, { onAction, ...opts })

const muted = ref(false)
const alertsSwitch: Alerts = { muted, toggle: () => (muted.value = !muted.value) }

const soloLobby: GameState = { ...lobbyState, players: lobbyState.players.slice(0, 1) }

const variants: [string, Room, Alerts?][] = [
  ['Join form (opened a room link)', at(null)],
  [
    'Connecting to the game server',
    at(null, 'p9', { identity: newcomer, connection: 'connecting' }),
  ],
  ['Waiting for the room to answer', at(null, 'p9', { identity: newcomer })],
  ['Joining (not let in yet)', at(lobbyState, 'p9', { identity: newcomer })],
  ['Removed from the room', at(lobbyState, 'p9', { identity: newcomer, kicked: true })],
  ['Room closed', at({ ...lobbyState, closed: true }, 'p2')],
  ['Game over, opened afterwards', at(overState, 'p9', { identity: newcomer })],
  ['Lobby, my tab relays', at(lobbyState, 'p1')],
  ['Lobby, my tab relays and nobody could take over', at(soloLobby, 'p1')],
  ['Lobby, as a player', at(lobbyState, 'p2')],
  ['Lobby, ready-made pack', at(packLobbyState, 'p2')],
  ['Playing a pack round', at(packPlayingState, 'p2')],
  ['Writing, before sending', at(writingState, 'p2')],
  ['Writing, entry sent', at(writingState, 'p1')],
  ['Playing, my turn', at(playingState, 'p3')],
  ['Playing, with the alerts switch', at(playingState, 'p3'), alertsSwitch],
  ["Playing, someone else's turn", at(playingState, 'p1')],
  ["Voting on Chen's guess", at(votingState, 'p2')],
  ['I am guessing', at(votingState, 'p3')],
  ['Solved my card', at(playingState, 'p2')],
  ['Watching (joined after the deal)', at(playingState, 'p5')],
  ['Round over, finish vote open', at(finishedState, 'p1')],
  ['Game over', at(overState, 'p2')],
  ['Banner: lost connection', at(playingState, 'p1', { connection: 'connecting' })],
  ["Banner: relay's tab gone", at(playingState, 'p2', { hostAlive: false })],
  ['Banner: relay switched', at({ ...playingState, hostId: 'p3' }, 'p2', { relayChanged: true })],
]
</script>

<template>
  <Story title="RoomScreen (every state)" :layout="{ type: 'single', iframe: false }">
    <Variant v-for="[title, room, alerts] in variants" :key="title" :title="title">
      <div class="page">
        <RoomScreen :room="room" :alerts="alerts" />
      </div>
    </Variant>
  </Story>
</template>
