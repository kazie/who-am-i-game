<script setup lang="ts">
import { logEvent } from 'histoire/client'
import { entries } from '../fixtures'
import type { Entry } from '../game/protocol'
import EntryForm from './EntryForm.vue'

const onSubmit = (entry: Entry) => logEvent('submit', entry)
// Offline stand-ins for the Wikipedia lookup.
const fakeResolve = async (url: string) =>
  url.includes('wikipedia.org/wiki/') && !url.includes('#/media/') ? entries.lion.imageUrl : url
</script>

<template>
  <Story title="EntryForm" :layout="{ type: 'single', iframe: false }">
    <Variant title="Empty (live Wikipedia lookup)">
      <EntryForm theme="Big cats" @submit="onSubmit" />
    </Variant>
    <Variant title="Empty (offline lookup)">
      <EntryForm theme="Big cats" :resolve="fakeResolve" @submit="onSubmit" />
    </Variant>
    <Variant title="Filled in with a Wikipedia article">
      <EntryForm
        theme="Big cats"
        initial-label="Lion"
        initial-link="https://en.wikipedia.org/wiki/Lion"
        :resolve="fakeResolve"
        @submit="onSubmit"
      />
    </Variant>
    <Variant title="Submitted">
      <EntryForm theme="Big cats" :submitted="entries.serval" />
    </Variant>
  </Story>
</template>
