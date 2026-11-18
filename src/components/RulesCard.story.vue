<script setup lang="ts">
import RulesCard from './RulesCard.vue'
</script>

<template>
  <Story title="Room/RulesCard" :layout="{ type: 'grid', width: 420 }">
    <Variant title="Written cards">
      <RulesCard />
    </Variant>
    <Variant title="A pack round">
      <RulesCard pack />
    </Variant>
    <Variant title="Before you look (with a button)">
      <RulesCard title="Before you look">
        <button class="primary">Got it, show the cards</button>
      </RulesCard>
    </Variant>
  </Story>
</template>
