<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { roomLink } from '../game/links'
import { useMediaQuery } from '../game/useMediaQuery'
import { beforeDeal, nextRelays, playerById, roundsLabel } from '../game/reducer'
import type { Alerts } from '../game/useAlerts'
import type { Notes } from '../game/useNotes'
import type { Room } from '../game/useRoom'
import { resolveImageUrl } from '../game/wikipedia'
import EntryForm from './EntryForm.vue'
import GameBoard from './GameBoard.vue'
import GameControls from './GameControls.vue'
import AppIcon from './AppIcon.vue'
import JoinForm from './JoinForm.vue'
import NotesPanel from './NotesPanel.vue'
import PlayerList from './PlayerList.vue'
import RoomStatusBanners from './RoomStatusBanners.vue'
import ScoreBoard from './ScoreBoard.vue'
import TurnPanel from './TurnPanel.vue'

const props = withDefaults(
  defineProps<{
    room: Room
    /** Undefined when there's no picture; rejects when it couldn't be looked up. */
    resolveImage?: (url: string) => Promise<string | undefined>
    /** Sound, vibration and title alerts; only real rooms have them. */
    alerts?: Alerts
    /** This player's private notes; only real rooms have them. */
    notes?: Notes
  }>(),
  { resolveImage: (url: string) => resolveImageUrl(url), alerts: undefined, notes: undefined },
)
const emit = defineEmits<{ leave: [] }>()

const room = props.room
const router = useRouter()
const state = room.state
const me = room.me
const screenHref = router.resolve({ name: 'screen', params: { code: room.code } }).href

/** What the copy button says, and what a screen reader hears. */
const COPY = {
  idle: { label: 'Copy link', said: '' },
  copied: { label: 'Copied', said: 'Room link copied.' },
  failed: { label: "Couldn't copy", said: "Couldn't copy the link. The room code is on screen." },
}
const copy = ref<keyof typeof COPY>('idle')
// Back to "Copy link" after a moment; the timer goes away with the screen.
watch(copy, (value, _, onCleanup) => {
  if (value === 'idle') return
  const timer = setTimeout(() => (copy.value = 'idle'), 2500)
  onCleanup(() => clearTimeout(timer))
})

const relayName = computed(
  () => (state.value && playerById(state.value, state.value.hostId)?.name) ?? 'Someone',
)
/** Who takes over relaying if this tab leaves. */
const successor = computed(() => (state.value ? nextRelays(state.value)[0] : undefined))

async function copyLink() {
  let result: keyof typeof COPY
  try {
    await navigator.clipboard.writeText(roomLink(router, room.code))
    result = 'copied'
  } catch {
    // No clipboard (e.g. plain http): say so, the code is on screen anyway.
    result = 'failed'
  }
  // Clear the message for one render first, so a repeat restarts the timer and is read
  // out again, even when the clipboard answered straight away.
  copy.value = 'idle'
  await nextTick()
  copy.value = result
}

const confirmingLeave = ref(false)

// On a phone everything is one column (this is the layout's only breakpoint), and the
// button that moves the game on goes right under the current phase, in the DOM too, so
// reading and tab order match what you see. While playing it's only "vote to end early",
// which can wait below the cards. The controls are moved there, not rebuilt, so a
// half-typed next theme survives turning the phone.
const narrow = useMediaQuery('(max-width: 720px)')
const afterPhase = useTemplateRef<HTMLElement>('afterPhase')
const afterBoard = useTemplateRef<HTMLElement>('afterBoard')
const controlsTarget = computed(() =>
  !narrow.value ? null : state.value?.phase === 'playing' ? afterBoard.value : afterPhase.value,
)

function leave() {
  room.leave()
  emit('leave')
}

// The relay's tab holds the game. Leaving hands it on, but with nobody around to take over
// it ends the game for everyone, so ask first.
function leaveRoom() {
  if (room.isRelay.value && !successor.value && !confirmingLeave.value) {
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
      <template v-else>Waiting for the room to answer. Check that the room code is right.</template>
    </p>
    <button class="back" @click="leave">Back</button>
  </div>

  <div v-else-if="state.closed" class="panel stack">
    <h2>This room was closed</h2>
    <p class="muted">{{ relayName }} left, and nobody else was around to keep the room running.</p>
    <button class="back" @click="leave">Back to start</button>
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

  <div v-else class="stack room">
    <header class="room-header">
      <div>
        <p class="muted small">Round {{ state.round }} · Theme</p>
        <h1>{{ state.theme }}</h1>
      </div>
      <div class="stack tight">
        <p class="muted small">Room code</p>
        <div class="row">
          <code class="room-code code">{{ state.code }}</code>
          <button class="chip" @click="copyLink">{{ COPY[copy].label }}</button>
          <span class="sr-only" aria-live="polite">{{ COPY[copy].said }}</span>
        </div>
        <div class="row">
          <a
            class="small"
            :href="screenHref"
            target="_blank"
            rel="noopener"
            title="Open on a TV, or share this window in your call"
            ><AppIcon name="screen" /> Presentation screen</a
          >
          <button
            v-if="alerts"
            class="chip"
            :aria-pressed="!alerts.muted.value"
            title="A sound and a vibration when it's your turn or your vote"
            @click="alerts.toggle()"
          >
            <AppIcon :name="alerts.muted.value ? 'bell-off' : 'bell'" />
            {{ alerts.muted.value ? 'Alerts off' : 'Alerts on' }}
          </button>
        </div>
      </div>
    </header>

    <p v-if="room.isRelay.value" class="banner small">
      <AppIcon name="relay" /> Your tab keeps this room running. Please keep it open.
      <template v-if="successor">If you leave, {{ successor.name }}'s tab takes over.</template>
      <template v-else>Nobody else could take over right now.</template>
    </p>
    <RoomStatusBanners
      :connection="room.connection.value"
      :host-alive="room.hostAlive.value"
      :relay-name="relayName"
      :relay-changed="room.relayChanged.value && !room.isRelay.value"
    />

    <div class="layout" :class="{ narrow }">
      <div class="main stack">
        <section class="phase stack">
          <h2>{{ PHASE_TITLES[state.phase] }}</h2>

          <p v-if="state.phase === 'lobby'" class="muted">
            <template v-if="state.pack"
              >This round uses ready-made cards. When everyone has joined, anyone can hand them
              out.</template
            >
            <template v-else
              >When everyone has joined, anyone can start the writing round.</template
            >
          </p>

          <EntryForm
            v-else-if="state.phase === 'writing'"
            :theme="state.theme"
            :submitted="me.entry"
            :resolve="resolveImage"
            @submit="room.submit"
          />

          <template v-else-if="state.phase === 'playing'">
            <TurnPanel
              :state="state"
              :me-id="me.id"
              @guess="room.guess"
              @withdraw="room.withdrawGuess"
              @vote="room.vote"
              @pass="room.pass"
            />
            <NotesPanel v-if="notes && !me.solved && !me.spectator" :notes="notes" />
            <p v-if="me.solved" class="banner">
              You got it! +{{ state.roundScores[me.id] ?? 0 }} points. Keep answering and voting for
              the others.
            </p>
            <p v-else class="muted small">
              Everyone can see your card except you. On your turn, ask one yes/no question out loud,
              or make a guess.
            </p>
          </template>
        </section>

        <div ref="afterPhase" class="slot" />

        <GameBoard v-if="!beforeDeal(state)" :state="state" :me-id="me.id" />

        <div ref="afterBoard" class="slot" />
      </div>

      <aside class="side stack">
        <Teleport defer :to="controlsTarget" :disabled="!controlsTarget">
          <GameControls
            :state="state"
            :me-id="me.id"
            @start-writing="room.startWriting"
            @deal="room.deal"
            @vote-to-end="room.voteToEnd"
            @vote-to-finish="room.voteToFinish"
            @new-round="room.newRound"
          />
        </Teleport>
        <section v-if="state.phase !== 'lobby' || state.round > 1" class="panel stack">
          <h3>Points</h3>
          <ScoreBoard :state="state" :me-id="me.id" />
        </section>
        <section class="panel stack">
          <h3>Players ({{ state.players.length }})</h3>
          <PlayerList :state="state" :me-id="me.id" @kick="room.kick" />
        </section>
        <template v-if="confirmingLeave">
          <p class="banner warn small">
            Nobody else is around to keep the room running. Leaving ends the game for everyone.
          </p>
          <div class="row">
            <button class="primary" @click="leaveRoom">Close the room</button>
            <button @click="confirmingLeave = false">Stay</button>
          </div>
        </template>
        <button v-else class="leave" @click="leaveRoom">Leave room</button>
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
  font-size: clamp(1.75rem, 5vw, 2.5rem);
}
.code {
  font-size: 1.6rem;
}
.back,
.leave {
  align-self: start;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 32px;
  align-items: start;
}
.main {
  gap: 20px;
}
.side {
  gap: 24px;
}
/* Where the controls go on a phone: no box of its own, so an empty one adds no gap. */
.slot {
  display: contents;
}
/* One column on a phone; `narrow` comes from the same query that places the controls. */
.layout.narrow {
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}
</style>
