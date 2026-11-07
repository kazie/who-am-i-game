<script setup lang="ts">
import IndexCard from './IndexCard.vue'

const playground = () => ({
  head: 'Alice',
  lines: 'Written on the lines\nand the next one',
  seed: 'Alice',
  ruled: true,
})
</script>

<template>
  <Story title="Basics/IndexCard" :layout="{ type: 'grid', width: 240 }">
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
    <Variant title="Playground" :init-state="playground">
      <template #default="{ state }">
        <IndexCard :seed="state.seed || undefined" :ruled="state.ruled">
          <template #head>{{ state.head }}</template>
          <p v-for="(line, i) in state.lines.split('\n')" :key="i">{{ line }}</p>
        </IndexCard>
      </template>
      <template #controls="{ state }">
        <HstText v-model="state.head" title="Header" />
        <HstTextarea v-model="state.lines" title="Lines" />
        <HstText v-model="state.seed" title="Tilt seed (empty: straight)" />
        <HstCheckbox v-model="state.ruled" title="Ruled" />
      </template>
    </Variant>
  </Story>
</template>
