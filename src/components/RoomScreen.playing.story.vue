<script setup lang="ts">
import { alertsSwitch, myNotes, variant } from '../example/roomStates.stories'
import { finishedState, overState, packPlayingState, playingState, votingState } from '../fixtures'
import RoomScreen from './RoomScreen.vue'

/** Turns, guesses and votes, to the end of the game. */
const variants = [
  variant('My turn', playingState, 'p3'),
  variant('My turn, with the alerts switch', playingState, 'p3', {}, { alerts: alertsSwitch }),
  variant('My turn, with my notes', playingState, 'p3', {}, { notes: myNotes }),
  variant("Someone else's turn", playingState, 'p1'),
  variant('A pack round', packPlayingState, 'p2'),
  variant("Voting on Chen's guess", votingState, 'p2'),
  variant('I am guessing', votingState, 'p3'),
  variant('Solved my card', playingState, 'p2'),
  variant('Watching (joined after the deal)', playingState, 'p5'),
  variant('Round over, finish vote open', finishedState, 'p1'),
  variant('Game over', overState, 'p2'),
]
</script>

<template>
  <Story title="Room/RoomScreen/Playing">
    <Variant v-for="v in variants" :key="v.title" :title="v.title" :source="v.source">
      <div class="page">
        <RoomScreen v-bind="v.props" />
      </div>
    </Variant>
  </Story>
</template>
