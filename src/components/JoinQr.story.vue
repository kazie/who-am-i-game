<script setup lang="ts">
import { exampleJoinUrl as url } from '../fixtures'
import JoinQr from './JoinQr.vue'
</script>

<template>
  <Story title="JoinQr" :layout="{ type: 'grid', width: 260 }">
    <Variant title="Room link (during play)">
      <JoinQr :url="url" />
    </Variant>
    <Variant title="Large (lobby on a TV)">
      <JoinQr :url="url" :size="220" />
    </Variant>
  </Story>
</template>
