<script setup lang="ts">
import { myNotes } from '../example/roomStates.stories'
import { playingState } from '../fixtures'
import MyCard from './MyCard.vue'
</script>

<template>
  <!-- The dock caps its height with dvh, so these need the preview's own window (no grid). -->
  <Story title="Room/MyCard">
    <Variant title="Beside the cards, with my notes">
      <div class="page" style="max-width: 360px">
        <MyCard :state="playingState" me-id="p3" :notes="myNotes" />
      </div>
    </Variant>
    <Variant title="Docked on a phone (tap it)">
      <div class="page">
        <p class="muted">The cards would be here; the dock sticks to the bottom of the screen.</p>
        <div style="height: 120vh" />
        <MyCard :state="playingState" me-id="p3" :notes="myNotes" docked />
      </div>
    </Variant>
    <Variant title="Solved">
      <div class="page" style="max-width: 360px">
        <MyCard :state="playingState" me-id="p2" :notes="myNotes" />
      </div>
    </Variant>
  </Story>
</template>
