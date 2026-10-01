<script setup lang="ts">
import { logEvent } from 'histoire/client'
import { playingState, votingState } from '../fixtures'
import TurnPanel from './TurnPanel.vue'

const log = {
  onGuess: () => logEvent('guess', {}),
  onWithdraw: () => logEvent('withdraw', {}),
  onVote: (correct: boolean) => logEvent('vote', { correct }),
  onPass: () => logEvent('pass', {}),
}
// Dana (p4) has been away for a minute.
const awayTurn = { ...playingState, turn: 'p4' }
</script>

<template>
  <Story title="TurnPanel" :layout="{ type: 'grid', width: 340 }">
    <Variant title="My turn">
      <TurnPanel :state="playingState" me-id="p3" v-bind="log" />
    </Variant>
    <Variant title="Someone else's turn">
      <TurnPanel :state="playingState" me-id="p1" v-bind="log" />
    </Variant>
    <Variant title="I am guessing">
      <TurnPanel :state="votingState" me-id="p3" v-bind="log" />
    </Variant>
    <Variant title="Voting on Chen's guess">
      <TurnPanel :state="votingState" me-id="p2" v-bind="log" />
    </Variant>
    <Variant title="Already voted">
      <TurnPanel :state="votingState" me-id="p1" v-bind="log" />
    </Variant>
    <Variant title="Active player is away">
      <TurnPanel :state="awayTurn" me-id="p1" v-bind="log" />
    </Variant>
  </Story>
</template>
