<script setup lang="ts">
import { logEvent } from 'histoire/client'
import { staticRoom, type StaticRoomOptions } from '../example/staticRoom'
import {
  finishedState,
  lobbyState,
  overState,
  playingState,
  votingState,
  writingState,
} from '../fixtures'
import type { GameState } from '../game/protocol'
import type { Room } from '../game/useRoom'
import RoomScreen from './RoomScreen.vue'

/** Every screen a player can end up on, each frozen at one state. Buttons only log. */
const onAction = (name: string, args: unknown[]) => logEvent(name, { args })
const newcomer = { playerId: 'p9', name: 'Zoe', host: false }
const at = (state: GameState | null, meId?: string, opts: StaticRoomOptions = {}) =>
  staticRoom(state, meId, { onAction, ...opts })

const variants: [string, Room][] = [
  ['Join form (opened a room link)', at(null)],
  [
    'Connecting to the game server',
    at(null, 'p9', { identity: newcomer, connection: 'connecting' }),
  ],
  ["Waiting for the creator's tab", at(null, 'p9', { identity: newcomer })],
  ['Joining (not let in yet)', at(lobbyState, 'p9', { identity: newcomer })],
  ['Removed from the room', at(lobbyState, 'p9', { identity: newcomer, kicked: true })],
  ['Room closed', at({ ...lobbyState, closed: true }, 'p2')],
  ['Game over, opened afterwards', at(overState, 'p9', { identity: newcomer })],
  ['Lobby, as the creator', at(lobbyState, 'p1')],
  ['Lobby, as a player', at(lobbyState, 'p2')],
  ['Writing, before sending', at(writingState, 'p2')],
  ['Writing, entry sent', at(writingState, 'p1')],
  ['Playing, my turn', at(playingState, 'p3')],
  ["Playing, someone else's turn", at(playingState, 'p1')],
  ["Voting on Chen's guess", at(votingState, 'p2')],
  ['I am guessing', at(votingState, 'p3')],
  ['Solved my card', at(playingState, 'p2')],
  ['Watching (joined after the deal)', at(playingState, 'p5')],
  ['Round over, finish vote open', at(finishedState, 'p1')],
  ['Game over', at(overState, 'p2')],
  ['Banner: lost connection', at(playingState, 'p1', { connection: 'connecting' })],
  ["Banner: creator's tab gone", at(playingState, 'p2', { hostAlive: false })],
]
</script>

<template>
  <Story title="RoomScreen (every state)" :layout="{ type: 'single', iframe: false }">
    <Variant v-for="[title, room] in variants" :key="title" :title="title">
      <div class="page">
        <RoomScreen :room="room" />
      </div>
    </Variant>
  </Story>
</template>
