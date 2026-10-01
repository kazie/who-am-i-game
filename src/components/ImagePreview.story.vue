<script setup lang="ts">
import { entries } from '../fixtures'
import ImagePreview from './ImagePreview.vue'
</script>

<template>
  <Story title="ImagePreview" :layout="{ type: 'grid', width: 240 }">
    <Variant title="Image">
      <ImagePreview :src="entries.lion.imageUrl" alt="Lion" />
    </Variant>
    <Variant title="Caracal">
      <ImagePreview :src="entries.caracal.imageUrl" alt="Caracal" />
    </Variant>
    <Variant title="Loading">
      <ImagePreview alt="" loading />
    </Variant>
  </Story>
</template>
