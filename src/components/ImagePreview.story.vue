<script setup lang="ts">
import { entries } from '../fixtures'
import ImagePreview from './ImagePreview.vue'
</script>

<template>
  <Story title="ImagePreview" :layout="{ type: 'grid', width: 240 }">
    <Variant title="Image">
      <ImagePreview :src="entries.lion.imageUrl" alt="Lion" />
    </Variant>
    <Variant title="Loading">
      <ImagePreview alt="" loading />
    </Variant>
    <Variant title="Empty">
      <ImagePreview alt="" />
    </Variant>
    <Variant title="Failed">
      <ImagePreview src="https://example.invalid/x.jpg" alt="" />
    </Variant>
  </Story>
</template>
