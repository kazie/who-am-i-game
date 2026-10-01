<script setup lang="ts">
import { bigCatsSteps } from '../example/bigCats'
import ExampleGame from './ExampleGame.vue'
</script>

<template>
  <Story title="ExampleGame (Big cats walkthrough)" :layout="{ type: 'single', iframe: false }">
    <Variant title="Whole game, from the start">
      <ExampleGame :steps="bigCatsSteps" />
    </Variant>
    <Variant v-for="(s, i) in bigCatsSteps" :key="i" :title="`${i + 1}. ${s.title}`">
      <ExampleGame :steps="bigCatsSteps" :start="i" />
    </Variant>
  </Story>
</template>
