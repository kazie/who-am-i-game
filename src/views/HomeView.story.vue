<script setup lang="ts">
import HomeView from './HomeView.vue'
</script>

<template>
  <Story title="Views/HomeView" :layout="{ type: 'single', iframe: false }">
    <Variant title="Start page">
      <div class="page"><HomeView /></div>
    </Variant>
  </Story>
</template>
