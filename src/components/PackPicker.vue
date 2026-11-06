<script setup lang="ts">
import { PACKS } from '../game/packs'

/** The chosen pack id, or '' when everyone writes their own entry. */
const pack = defineModel<string>({ default: '' })
</script>

<template>
  <label>
    Cards
    <select v-model="pack">
      <option value="">Everyone writes one</option>
      <option v-for="p in PACKS" :key="p.id" :value="p.id">
        Pack: {{ p.theme }} ({{ p.entries.length }} cards)
      </option>
    </select>
  </label>
</template>
