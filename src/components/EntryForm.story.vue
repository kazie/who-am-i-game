<script setup lang="ts">
import { logEvent } from 'histoire/client'
import { entries } from '../fixtures'
import type { Entry } from '../game/protocol'
import { LIMITS } from '../game/protocol'
import EntryForm from './EntryForm.vue'

const onSubmit = (entry: Entry) => logEvent('submit', entry)
// Offline stand-ins for the Wikipedia lookup.
const fakeResolve = async (url: string) =>
  url.includes('wikipedia.org/wiki/') && !url.includes('#/media/') ? entries.lion.imageUrl : url
const noPicture = async () => undefined
const hugePicture = async () => `https://upload.wikimedia.org/${'x'.repeat(LIMITS.url)}.jpg`
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
    <Variant title="Article without a picture (press Send to see the nudge)">
      <EntryForm
        theme="Big cats"
        initial-label="Caracal"
        initial-link="https://en.wikipedia.org/wiki/Caracal"
        :resolve="noPicture"
        @submit="onSubmit"
      />
    </Variant>
    <Variant title="Picture link too long">
      <EntryForm
        theme="Big cats"
        initial-label="Serval"
        initial-link="https://en.wikipedia.org/wiki/Serval"
        :resolve="hugePicture"
        @submit="onSubmit"
      />
    </Variant>
    <Variant title="Not a link">
      <EntryForm theme="Big cats" initial-label="Puma" initial-link="puma on wikipedia" />
    </Variant>
    <Variant title="Submitted">
      <EntryForm theme="Big cats" :submitted="entries.serval" />
    </Variant>
    <Variant title="Submitted without picture">
      <EntryForm theme="Big cats" :submitted="entries.noPicture" />
    </Variant>
  </Story>
</template>
