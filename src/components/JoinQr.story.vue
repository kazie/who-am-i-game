<script setup lang="ts">
import { exampleJoinUrl as url } from '../fixtures'
import JoinQr from './JoinQr.vue'

const playground = () => ({ url, size: 140 })
</script>

<template>
  <!-- Not a grid: its 33vw cap has to measure the preview, which only an iframe does. -->
  <Story title="Presentation screen/JoinQr">
    <Variant title="Room link (during play)">
      <JoinQr :url="url" />
    </Variant>
    <Variant title="Large (lobby on a TV)">
      <JoinQr :url="url" :size="220" />
    </Variant>
    <Variant title="Playground" :init-state="playground">
      <template #default="{ state }">
        <JoinQr :url="state.url" :size="state.size" />
      </template>
      <template #controls="{ state }">
        <HstText v-model="state.url" title="Link" />
        <HstSlider v-model="state.size" title="Size" :min="80" :max="320" :step="10" />
      </template>
    </Variant>
  </Story>
</template>
