<script setup lang="ts">
import { ref } from 'vue'
import PackPicker from './PackPicker.vue'

const writing = ref('')
const animals = ref('animals')
</script>

<template>
  <Story title="Start/PackPicker" :layout="{ type: 'grid', width: 320 }">
    <Variant title="Everyone writes (default)">
      <PackPicker v-model="writing" />
      <p class="muted small">Chosen: {{ writing || 'none' }}</p>
    </Variant>
    <Variant title="A pack chosen">
      <PackPicker v-model="animals" />
      <p class="muted small">Chosen: {{ animals || 'none' }}</p>
    </Variant>
  </Story>
</template>
