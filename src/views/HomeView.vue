<script setup lang="ts">
import { useRouter } from 'vue-router'
import JoinForm from '../components/JoinForm.vue'
import ThemeForm from '../components/ThemeForm.vue'
import { randomRoomCode } from '../game/ids'
import { browserStorage } from '../game/storage'
import { hostRoom, joinRoom } from '../game/useRoom'

const router = useRouter()

function create({ theme, name }: { theme: string; name: string }) {
  const code = randomRoomCode()
  hostRoom({ code, theme, name }, { storage: browserStorage() })
  router.push({ name: 'room', params: { code } })
}

function join({ code, name }: { code: string; name: string }) {
  joinRoom(code, name, browserStorage())
  router.push({ name: 'room', params: { code } })
}
</script>

<template>
  <div class="stack">
    <p class="intro">
      Everyone gets a secret identity that the whole table can see, except you. Ask yes/no questions
      out loud until you figure out who you are.
    </p>
    <p><RouterLink to="/example">👀 See an example game</RouterLink> to find out how it works.</p>
    <div class="home">
      <ThemeForm @create="create" />
      <JoinForm @join="join" />
    </div>
  </div>
</template>

<style scoped>
.intro {
  font-size: 1.1rem;
  max-width: 60ch;
}
.home {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  align-items: start;
}
</style>
