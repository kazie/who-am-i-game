<script setup lang="ts">
import { logEvent } from 'histoire/client'
import ThemeForm from './ThemeForm.vue'
</script>

<template>
  <Story title="ThemeForm" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Create a room">
      <ThemeForm @create="logEvent('create', $event)" />
    </Variant>
  </Story>
</template>
