<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

const names: IconName[] = ['mic', 'relay', 'bell', 'bell-off', 'screen', 'check', 'x']
</script>

<template>
  <Story title="AppIcon" :layout="{ type: 'single', iframe: false }">
    <Variant title="All icons">
      <ul class="icons">
        <li v-for="n in names" :key="n"><AppIcon :name="n" /> {{ n }}</li>
      </ul>
    </Variant>
    <Variant title="In text">
      <p style="font-size: 2rem"><AppIcon name="mic" /> Chen's turn</p>
    </Variant>
  </Story>
</template>

<style scoped>
.icons {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 8px;
  font-size: 1.25rem;
}
</style>
