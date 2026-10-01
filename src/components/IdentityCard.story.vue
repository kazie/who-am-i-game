<script setup lang="ts">
import { entries } from '../fixtures'
import IdentityCard from './IdentityCard.vue'
</script>

<template>
  <Story title="IdentityCard" :layout="{ type: 'grid', width: 240 }">
    <Variant title="With picture">
      <IdentityCard player-name="Bob" :entry="entries.lion" author-name="Alice" :hidden="false" />
    </Variant>
    <Variant title="Caracal">
      <IdentityCard
        player-name="Dana"
        :entry="entries.caracal"
        author-name="Chen"
        :hidden="false"
      />
    </Variant>
    <Variant title="Own card, hidden">
      <IdentityCard player-name="Alice" :entry="entries.tiger" hidden is-me />
    </Variant>
    <Variant title="Own card, solved">
      <IdentityCard
        player-name="Alice"
        :entry="entries.tiger"
        author-name="Bob"
        :hidden="false"
        is-me
        solved
      />
    </Variant>
    <Variant title="Away">
      <IdentityCard player-name="Dana" :entry="entries.serval" :hidden="false" away />
    </Variant>
  </Story>
</template>
