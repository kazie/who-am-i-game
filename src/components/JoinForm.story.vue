<script setup lang="ts">
import { logEvent } from 'histoire/client'
import JoinForm from './JoinForm.vue'
</script>

<template>
  <Story title="JoinForm" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Join with a code">
      <JoinForm @join="logEvent('join', $event)" />
    </Variant>
    <Variant title="Join a known room (opened from a link)">
      <JoinForm code="CATS7" @join="logEvent('join', $event)" />
    </Variant>
  </Story>
</template>
