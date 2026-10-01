<script setup lang="ts">
import { computed, ref } from 'vue'
import { playerById, roundsLabel } from '../game/reducer'
import type { Room } from '../game/useRoom'
import { resolveImageUrl } from '../game/wikipedia'
import EntryForm from './EntryForm.vue'
import GameBoard from './GameBoard.vue'
import GameControls from './GameControls.vue'
import JoinForm from './JoinForm.vue'
import PlayerList from './PlayerList.vue'
import RoomStatusBanners from './RoomStatusBanners.vue'
import ScoreBoard from './ScoreBoard.vue'
import TurnPanel from './TurnPanel.vue'

const props = withDefaults(
  defineProps<{
    room: Room
    resolveImage?: (url: string) => Promise<string | undefined>
  }>(),
  { resolveImage: (url: string) => resolveImageUrl(url) },
)
const emit = defineEmits<{ leave: [] }>()

const room = props.room
const state = room.state
const me = room.me
const copied = ref(false)

const relayName = computed(
  () => (state.value && playerById(state.value, state.value.hostId)?.name) ?? 'The creator',
)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard unavailable: the code is on screen anyway */
  }
}

const confirmingLeave = ref(false)

function leave() {
  room.leave()
  emit('leave')
}

// The creator's tab holds the game: leaving ends it for everyone, so ask first.
function leaveRoom() {
  if (room.isHost.value && !confirmingLeave.value) {
    confirmingLeave.value = true
    return
  }
  confirmingLeave.value = false
  leave()
}

const PHASE_TITLES = {
  lobby: 'Waiting for players',
  writing: 'Everyone writes one',
  playing: 'Who am I?',
  finished: 'Round over',
  over: 'Game over',
} as const
</script>

<template>
  <JoinForm v-if="!room.identity.value" :code="room.code" @join="({ name }) => room.join(name)" />

  <div v-else-if="!state" class="panel stack">
    <h2>Connecting to room {{ room.code }}…</h2>
    <p class="muted">
      <template v-if="room.connection.value !== 'open'">Connecting to the game server…</template>
      <template v-else
        >Waiting for the room creator's tab to answer. Check that the room code is right.</template
      >
    </p>
    <button @click="leave">Back</button>
  </div>

  <div v-else-if="state.closed" class="panel stack">
    <h2>This room was closed</h2>
    <p class="muted">{{ relayName }} left, and their tab was keeping the room running.</p>
    <button @click="leave">Back to start</button>
  </div>

  <div v-else-if="!me" class="panel stack">
    <template v-if="state.phase === 'over'">
      <h2>This game is over</h2>
      <p class="muted">It ended after {{ roundsLabel(state.round) }}.</p>
      <ScoreBoard :state="state" />
    </template>
    <template v-else-if="room.kicked.value">
      <h2>You were removed from this room</h2>
      <p class="muted">You can join again as a new player.</p>
    </template>
    <template v-else>
      <h2>Joining room {{ room.code }}…</h2>
      <p class="muted">Waiting for the room to let you in…</p>
    </template>
    <div class="row">
      <button v-if="room.kicked.value" class="primary" @click="room.leave()">Join again</button>
      <button @click="leave">Back</button>
    </div>
  </div>

  <div v-else class="stack">
    <header class="room-header">
      <div>
        <p class="muted small">Round {{ state.round }} · Theme</p>
        <h1>{{ state.theme }}</h1>
      </div>
      <div class="code-box">
        <p class="muted small">Room code</p>
        <div class="row">
          <code class="code">{{ state.code }}</code>
          <button class="chip" @click="copyLink">{{ copied ? 'Copied!' : 'Copy link' }}</button>
        </div>
        <a
          class="small"
          :href="`#/room/${state.code}/screen`"
          target="_blank"
          title="Open on a TV, or share this window in your call"
          >📺 Presentation screen</a
        >
      </div>
    </header>

    <p v-if="room.isHost.value" class="banner small">
      📡 You created this room, so your tab keeps it running. Please keep it open until the game is
      over.
    </p>
    <RoomStatusBanners
      :connection="room.connection.value"
      :host-alive="room.hostAlive.value"
      :relay-name="relayName"
    />

    <div class="layout">
      <section class="stack main">
        <h2>{{ PHASE_TITLES[state.phase] }}</h2>

        <p v-if="state.phase === 'lobby'" class="muted">
          When everyone has joined, anyone can start the writing round.
        </p>

        <EntryForm
          v-else-if="state.phase === 'writing'"
          :theme="state.theme"
          :submitted="me.entry"
          :resolve="resolveImage"
          @submit="room.submit"
        />

        <template v-else>
          <template v-if="state.phase === 'playing'">
            <TurnPanel
              :state="state"
              :me-id="me.id"
              @guess="room.guess"
              @withdraw="room.withdrawGuess"
              @vote="room.vote"
              @pass="room.pass"
            />
            <p v-if="me.solved" class="banner">
              You got it! +{{ state.roundScores[me.id] ?? 0 }} points. Keep answering and voting for
              the others.
            </p>
            <p v-else class="muted small">
              Everyone can see your card except you. On your turn, ask one yes/no question out loud,
              or make a guess.
            </p>
          </template>
          <GameBoard :state="state" :me-id="me.id" />
        </template>
      </section>

      <aside class="stack">
        <GameControls
          :state="state"
          :me-id="me.id"
          @start-writing="room.startWriting"
          @deal="room.deal"
          @vote-to-end="room.voteToEnd"
          @vote-to-finish="room.voteToFinish"
          @new-round="room.newRound"
        />
        <div v-if="state.phase !== 'lobby' || state.round > 1" class="panel stack">
          <h3>Points</h3>
          <ScoreBoard :state="state" :me-id="me.id" />
        </div>
        <div class="panel stack">
          <h3>Players ({{ state.players.length }})</h3>
          <PlayerList :state="state" :me-id="me.id" @kick="room.kick" />
        </div>
        <template v-if="confirmingLeave">
          <p class="banner warn small">
            Your tab keeps this room running. Leaving ends the game for everyone.
          </p>
          <div class="row">
            <button class="primary" @click="leaveRoom">Close the room</button>
            <button @click="confirmingLeave = false">Stay</button>
          </div>
        </template>
        <button v-else @click="leaveRoom">Leave room</button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.room-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}
.room-header p {
  margin: 0;
}
.room-header h1 {
  margin: 0;
}
.code {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.15em;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 720px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
