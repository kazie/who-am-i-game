<script setup lang="ts">
import ExampleGame from '../components/ExampleGame.vue'
import { bigCatsSteps } from '../example/bigCats'
</script>

<template>
  <div class="stack">
    <h1>How to play: an example game</h1>
    <p class="muted intro">
      Five friends play two rounds with the theme "Big cats". Step through the game to see what each
      player's phone shows, and what the shared presentation screen shows. Tip: the arrow keys work
      too, and you can switch to any player's phone.
    </p>
    <ExampleGame :steps="bigCatsSteps" />
    <RouterLink to="/">← Back to start</RouterLink>
  </div>
</template>

<style scoped>
h1 {
  margin: 0;
}
.intro {
  max-width: 70ch;
  margin: 0;
}
</style>
