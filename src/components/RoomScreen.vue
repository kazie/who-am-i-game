<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { roomLink } from '../game/links'
import { useMediaQuery } from '../game/useMediaQuery'
import { beforeDeal, nextRelays, playerById, roundsLabel } from '../game/reducer'
import { attentionFor, type Alerts } from '../game/useAlerts'
import type { Notes } from '../game/useNotes'
import type { Room } from '../game/useRoom'
import type { Rules } from '../game/useRules'
import { resolveImageUrl } from '../game/wikipedia'
import EntryForm from './EntryForm.vue'
import GameBoard from './GameBoard.vue'
import GameControls from './GameControls.vue'
import AppIcon from './AppIcon.vue'
import JoinForm from './JoinForm.vue'
import MyCard from './MyCard.vue'
import PlayerList from './PlayerList.vue'
import RoomStatusBanners from './RoomStatusBanners.vue'
import RulesCard from './RulesCard.vue'
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
    /**
     * Whether this browser has read why cards are secret; until then the others' cards are
     * covered. Only real rooms have it: the example game and stories show the cards.
     */
    rules?: Rules
  }>(),
  {
    resolveImage: (url: string) => resolveImageUrl(url),
    alerts: undefined,
    notes: undefined,
    rules: undefined,
  },
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
// reading and tab order match what you see. While playing, the table comes first: whose
// turn it is (stuck to the top), the cards, then the controls ("vote to end early"), points
// and players. Your own card and notes go beside the cards on a wide screen, or in a dock
// at the bottom of a phone's. Everything is moved there, not rebuilt, so a half-typed theme
// or note survives turning the phone.
const narrow = useMediaQuery('(max-width: 720px)')
const afterPhase = useTemplateRef<HTMLElement>('afterPhase')
const afterBoard = useTemplateRef<HTMLElement>('afterBoard')
const afterControls = useTemplateRef<HTMLElement>('afterControls')
const dock = useTemplateRef<HTMLElement>('dock')
const playing = computed(() => state.value?.phase === 'playing')
/** You hold a card this round (not watching). */
const inRound = computed(() => playing.value && me.value !== undefined && !me.value.spectator)
/** A wide screen while you play: the side column is yours, everything else goes under the cards. */
const besideCards = computed(() => inRound.value && !narrow.value)
/** Where each moved block goes; null keeps it in the side column. */
const placement = computed(() => {
  if (narrow.value)
    return {
      controls: playing.value ? afterBoard.value : afterPhase.value,
      ledgers: null,
      myCard: dock.value,
    }
  const under = besideCards.value
  return {
    controls: under ? afterBoard.value : null,
    ledgers: under ? afterControls.value : null,
    myCard: null,
  }
})
/**
 * Until this browser has read why the cards are secret, a short note takes the place of
 * the turn bar and the cards: nothing on screen names someone else's card.
 */
const covered = computed(
  () => playing.value && props.rules !== undefined && !props.rules.seen.value,
)
/** While covered, the game may already be waiting for this player: say so on the note. */
const waitingOnMe = computed(() =>
  covered.value ? attentionFor(state.value, me.value?.id) : undefined,
)
/** "How to play" on demand: the lobby always shows it, and the note above includes it. */
const rulesOnDemand = computed(() => state.value?.phase !== 'lobby' && !covered.value)
const showRules = ref(false)

function leave() {
  room.leave()
  emit('leave')
}

/**
 * Why leaving needs a second tap, if it does. The relay's tab holds the game: leaving hands
 * it on, but with nobody around to take over it ends the game for everyone. And mid-round,
 * leaving gives up your card for the rest of the round.
 */
const leaveWarning = computed(() => {
  if (room.isRelay.value && !successor.value)
    return {
      text: 'Nobody else is around to keep the room running. Leaving ends the game for everyone.',
      action: 'Close the room',
    }
  if (inRound.value)
    return {
      text: "Leaving now takes you out of this round: your turns stop, and you can't come back into it.",
      action: 'Leave anyway',
    }
  return undefined
})

// A question that no longer applies (someone arrived who can keep the room running, the
// round ended) is dropped, so it never comes back by itself.
watch(leaveWarning, (w) => {
  if (!w) confirmingLeave.value = false
})

function leaveRoom() {
  if (leaveWarning.value && !confirmingLeave.value) {
    confirmingLeave.value = true
    return
  }
  confirmingLeave.value = false
  leave()
}

const PHASE_TITLES = {
  lobby: 'Waiting for players',
  writing: 'Writing the cards',
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

  <div v-else class="stack room" :class="{ 'cards-out': !beforeDeal(state) }">
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
          <button
            v-if="rulesOnDemand"
            class="chip"
            :aria-expanded="showRules"
            @click="showRules = !showRules"
          >
            How to play
          </button>
        </div>
      </div>
    </header>

    <p v-if="room.isRelay.value" class="banner small">
      <AppIcon name="relay" /> You're the host. Your tab keeps this room running, so please keep it
      open. If someone gets stuck or drops out, you can skip their turn or remove them.
      <template v-if="successor">If you leave, {{ successor.name }} takes over as host.</template>
      <template v-else>Nobody else could take over right now.</template>
    </p>
    <RoomStatusBanners
      :connection="room.connection.value"
      :host-alive="room.hostAlive.value"
      :relay-name="relayName"
      :relay-changed="room.relayChanged.value && !room.isRelay.value"
    />
    <RulesCard v-if="showRules && rulesOnDemand" :pack="!!state.pack" />

    <div class="layout" :class="{ narrow, 'beside-cards': besideCards }">
      <div class="main stack">
        <RulesCard v-if="covered && rules" title="Before you look" :pack="!!state.pack">
          <p v-if="waitingOnMe" class="banner warn" role="status">
            {{
              waitingOnMe === 'turn'
                ? "It's your turn! Read this, then tap the button below."
                : 'The others need your vote. Read this, then tap the button below.'
            }}
          </p>
          <p>
            <strong>The cards on the next screen belong to the other players.</strong> Each of them
            is trying to work out their own, so never read a card out loud, and never name it in a
            question.
          </p>
          <button class="primary" @click="rules.accept()">Got it, show the cards</button>
        </RulesCard>

        <!-- Whose turn it is stays stuck to the top of the screen while you look at the cards. -->
        <TurnPanel
          v-else-if="playing"
          class="turn-bar"
          :state="state"
          :me-id="me.id"
          @guess="room.guess"
          @withdraw="room.withdrawGuess"
          @vote="room.vote"
          @pass="room.pass"
        />

        <section v-else class="phase stack">
          <h2>{{ PHASE_TITLES[state.phase] }}</h2>

          <template v-if="state.phase === 'lobby'">
            <p class="muted">
              <template v-if="state.pack"
                >This round uses ready-made cards. When everyone has joined, anyone can hand them
                out.</template
              >
              <template v-else
                >When everyone has joined, anyone can start the writing round.</template
              >
            </p>
            <RulesCard :pack="!!state.pack" />
          </template>

          <EntryForm
            v-else-if="state.phase === 'writing'"
            :theme="state.theme"
            :submitted="me.entry"
            :resolve="resolveImage"
            @submit="room.submit"
          />
        </section>

        <div ref="afterPhase" class="slot" />

        <GameBoard
          v-if="!beforeDeal(state) && !covered"
          :state="state"
          :me-id="me.id"
          :mine-apart="inRound"
        />

        <div ref="afterBoard" class="slot" />
        <div ref="afterControls" class="slot" />
      </div>

      <aside class="side stack">
        <Teleport v-if="inRound" defer :to="placement.myCard" :disabled="!placement.myCard">
          <MyCard :state="state" :me-id="me.id" :notes="notes" :docked="narrow" />
        </Teleport>
        <Teleport defer :to="placement.controls" :disabled="!placement.controls">
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
        <Teleport defer :to="placement.ledgers" :disabled="!placement.ledgers">
          <div class="ledgers">
            <section v-if="state.phase !== 'lobby' || state.round > 1" class="panel stack">
              <h3>Points</h3>
              <ScoreBoard :state="state" :me-id="me.id" />
            </section>
            <section class="panel stack">
              <h3>Players ({{ state.players.length }})</h3>
              <PlayerList :state="state" :me-id="me.id" @kick="room.kick" />
            </section>
            <div class="stack">
              <template v-if="confirmingLeave && leaveWarning">
                <p class="banner warn small">{{ leaveWarning.text }}</p>
                <div class="row">
                  <button class="primary" @click="leaveRoom">{{ leaveWarning.action }}</button>
                  <button @click="confirmingLeave = false">Stay</button>
                </div>
              </template>
              <button v-else class="leave" @click="leaveRoom">Leave room</button>
            </div>
          </div>
        </Teleport>
      </aside>
    </div>

    <!-- On a phone, your card and notes dock here, at the bottom of the screen. -->
    <div ref="dock" class="slot" />
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
.ledgers {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
/* Whose turn it is: stuck to the top of the screen, above the notes dock if they meet. */
.turn-bar {
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: 3;
}
/* Playing on a wide screen: your card and notes stay put beside the cards. */
.layout.beside-cards {
  grid-template-columns: minmax(0, 1fr) 320px;
}
.layout.beside-cards .side {
  position: sticky;
  top: 16px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}
/* Under the cards, the points and players sit side by side when there is room. */
.main .ledgers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  align-items: start;
}
</style>
