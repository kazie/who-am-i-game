<script setup lang="ts">
import IndexCard from './IndexCard.vue'
</script>

<template>
  <Story title="IndexCard" :layout="{ type: 'grid', width: 240 }">
    <Variant title="Ruled">
      <IndexCard seed="Alice">
        <template #head>Alice</template>
        <p>Written on the lines</p>
        <p>and the next one</p>
      </IndexCard>
    </Variant>
    <Variant title="Straight, plain body">
      <IndexCard :ruled="false">
        <template #head>Plain</template>
        <p>A body without rules, for forms and lists.</p>
      </IndexCard>
    </Variant>
  </Story>
</template>
