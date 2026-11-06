<script setup lang="ts">
import { useRouter } from 'vue-router'
import JoinForm from '../components/JoinForm.vue'
import ThemeForm from '../components/ThemeForm.vue'
import { randomRoomCode } from '../game/ids'
import { browserStorage } from '../game/storage'
import { hostRoom, joinRoom } from '../game/useRoom'

const router = useRouter()

function create(opts: { theme: string; name: string; pack?: string }) {
  const code = randomRoomCode()
  hostRoom({ code, ...opts }, { storage: browserStorage() })
  router.push({ name: 'room', params: { code } })
}

function join({ code, name }: { code: string; name: string }) {
  joinRoom(code, name, browserStorage())
  router.push({ name: 'room', params: { code } })
}
</script>

<template>
  <div class="stack">
    <h1 class="title">Everyone can read your card. Except you.</h1>
    <p class="intro">
      Each player gets a secret identity that the whole table can see. Ask yes/no questions out loud
      until you figure out who you are.
      <RouterLink to="/example">See an example game</RouterLink> to find out how it works.
    </p>
    <div class="home">
      <ThemeForm @create="create" />
      <JoinForm @join="join" />
    </div>
  </div>
</template>

<style scoped>
.title {
  max-width: 18ch;
  margin: 8px 0 0;
  font-size: clamp(2.2rem, 7vw, 3.75rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.02;
}
.intro {
  font-size: 1.15rem;
  max-width: 56ch;
  margin: 0 0 24px;
}
.home {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px 40px;
  align-items: start;
}
</style>
