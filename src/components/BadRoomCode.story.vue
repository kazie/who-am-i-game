<script setup lang="ts">
import { logEvent } from 'histoire/client'
import BadRoomCode from './BadRoomCode.vue'
</script>

<template>
  <Story title="BadRoomCode" :layout="{ type: 'grid', width: 420 }">
    <Variant title="Player link with a mistyped code">
      <BadRoomCode code="ABCD0" @join="logEvent('join', $event)" />
    </Variant>
    <Variant title="Presentation screen link with a mistyped code">
      <BadRoomCode code="CAT5" screen @open="logEvent('open', { code: $event })" />
    </Variant>
  </Story>
</template>
