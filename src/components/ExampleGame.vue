<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ExampleStep } from '../example/bigCats'
import { staticRoom } from '../example/staticRoom'
import { activePlayers, playerById } from '../game/reducer'
import RoomScreen from './RoomScreen.vue'
import ScreenBoard from './ScreenBoard.vue'

/**
 * Steps through a recorded game: one player's phone next to the presentation screen,
 * with a short explanation per step.
 */
const props = withDefaults(defineProps<{ steps: readonly ExampleStep[]; start?: number }>(), {
  start: 0,
})

const index = ref(Math.min(props.start, props.steps.length - 1))
const step = computed(() => props.steps[index.value]!)
// Follow the step's player, until someone picks another phone to look at.
const picked = ref<string>()
const focus = computed(() => picked.value ?? step.value.focus)
const players = computed(() => activePlayers(step.value.state))
const focusName = computed(() => playerById(step.value.state, focus.value)?.name ?? '?')
const room = computed(() => staticRoom(step.value.state, focus.value))

watch(index, () => (picked.value = undefined))

const back = () => (index.value = Math.max(0, index.value - 1))
const next = () => (index.value = Math.min(props.steps.length - 1, index.value + 1))

function onKey(ev: KeyboardEvent) {
  if (ev.target instanceof HTMLInputElement) return
  if (ev.key === 'ArrowRight') next()
  if (ev.key === 'ArrowLeft') back()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="stack example">
    <div class="panel stack narration">
      <div class="row nav">
        <button :disabled="index === 0" @click="back">◀ Back</button>
        <span class="muted small">Step {{ index + 1 }} of {{ steps.length }}</span>
        <button class="primary" :disabled="index === steps.length - 1" @click="next">Next ▶</button>
      </div>
      <h2>{{ step.title }}</h2>
      <p>{{ step.text }}</p>
    </div>

    <div class="panes">
      <section class="stack">
        <div class="row">
          <h3>📱 {{ focusName }}'s phone</h3>
        </div>
        <div class="row" role="group" aria-label="Show another player's phone">
          <button
            v-for="p in players"
            :key="p.id"
            class="chip"
            :class="{ primary: p.id === focus }"
            @click="picked = p.id"
          >
            {{ p.name }}
          </button>
        </div>
        <div class="device">
          <RoomScreen :key="`${index}-${focus}`" :room="room" />
        </div>
      </section>

      <section class="stack">
        <h3>📺 Presentation screen</h3>
        <div class="device tv">
          <ScreenBoard :state="step.state" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.nav {
  justify-content: space-between;
}
.narration h2 {
  margin: 0;
}
.narration p {
  margin: 0;
  font-size: 1.05rem;
}
.panes {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
@media (max-width: 1000px) {
  .panes {
    grid-template-columns: minmax(0, 1fr);
  }
}
.panes h3 {
  margin: 0;
}
.device {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--bg);
  /* The panes are narrower than a real screen: keep the inner layouts compact. */
  font-size: 0.9rem;
}
.device.tv {
  background: var(--surface-2);
}
</style>
