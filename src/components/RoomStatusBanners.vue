<script setup lang="ts">
import type { ConnectionStatus } from '../bridge/types'

/** The one warning worth showing about the room's connection, if any. */
defineProps<{
  connection: ConnectionStatus
  hostAlive: boolean
  /** Whose tab keeps the room running. */
  relayName: string
  closed?: boolean
}>()
</script>

<template>
  <p v-if="closed" class="banner warn">
    This room was closed: {{ relayName }} left, and their tab was keeping it running.
  </p>
  <p v-else-if="connection !== 'open'" class="banner warn">
    Lost connection to the game server, reconnecting…
  </p>
  <p v-else-if="!hostAlive" class="banner warn">
    {{ relayName }}'s tab keeps the room running and seems to be gone. The game continues when it
    comes back.
  </p>
</template>
