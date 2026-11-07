<script setup lang="ts">
import { entries } from '../fixtures'
import IdentityCard from './IdentityCard.vue'

type Cat = keyof typeof entries
/** The fixture cats, plus a card with nothing written on it yet. */
const entryOptions = [
  ...Object.entries(entries).map(([value, entry]) => ({ value, label: entry.label })),
  { value: 'none', label: 'No identity' },
]
const playground = () => ({
  playerName: 'Bob',
  authorName: 'Alice',
  entry: 'lion',
  hidden: false,
  isMe: false,
  turn: false,
  guessing: false,
  solved: false,
  turns: 3,
  away: false,
})
</script>

<template>
  <Story title="Room/IdentityCard" :layout="{ type: 'grid', width: 240 }">
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
        :turns="4"
      />
    </Variant>
    <Variant title="Solved on the first turn">
      <IdentityCard
        player-name="Bob"
        :entry="entries.lion"
        author-name="Alice"
        :hidden="false"
        solved
        :turns="1"
      />
    </Variant>
    <Variant title="Away">
      <IdentityCard player-name="Dana" :entry="entries.serval" :hidden="false" away />
    </Variant>
    <Variant title="Playground" :init-state="playground">
      <template #default="{ state }">
        <IdentityCard
          :player-name="state.playerName"
          :author-name="state.authorName"
          :entry="state.entry === 'none' ? undefined : entries[state.entry as Cat]"
          :hidden="state.hidden"
          :is-me="state.isMe"
          :turn="state.turn"
          :guessing="state.guessing"
          :solved="state.solved"
          :turns="state.turns"
          :away="state.away"
        />
      </template>
      <template #controls="{ state }">
        <HstText v-model="state.playerName" title="Player" />
        <HstText v-model="state.authorName" title="Written by" />
        <HstSelect v-model="state.entry" title="Entry" :options="entryOptions" />
        <HstCheckbox v-model="state.hidden" title="Hidden (???)" />
        <HstCheckbox v-model="state.isMe" title="My own card" />
        <HstCheckbox v-model="state.turn" title="Their turn" />
        <HstCheckbox v-model="state.guessing" title="Guessing" />
        <HstCheckbox v-model="state.solved" title="Solved" />
        <!-- A slider, not HstNumber: that one lets the field go empty or below 1. -->
        <HstSlider v-model="state.turns" title="Turns to solve" :min="1" :max="12" />
        <HstCheckbox v-model="state.away" title="Away" />
      </template>
    </Variant>
  </Story>
</template>
