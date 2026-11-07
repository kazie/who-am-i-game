<script setup lang="ts">
import { memoryStorage } from '../game/storage'
import { useNotes } from '../game/useNotes'
import NotesPanel from './NotesPanel.vue'

// Histoire can't print live notes in the Source panel; say what they are instead.
const source = `<NotesPanel :notes="useNotes(memoryStorage(), () => roomCode)" />`

const empty = useNotes(memoryStorage(), () => 'empty')

const filled = useNotes(memoryStorage(), () => 'filled')
filled.add('Am I an animal?')
filled.add('Do I live in Africa?')
filled.add('Am I bigger than a dog?')
filled.add('Do I have spots?')
const [animal, africa, , spots] = filled.notes.value
filled.setAnswer(animal!.id, 'yes')
filled.setAnswer(africa!.id, 'maybe')
filled.setAnswer(spots!.id, 'no')
</script>

<template>
  <Story title="Room/NotesPanel" :layout="{ type: 'grid', width: 360 }">
    <Variant title="No notes yet" :source="source">
      <NotesPanel :notes="empty" />
    </Variant>
    <Variant title="A few answers" :source="source">
      <NotesPanel :notes="filled" />
    </Variant>
  </Story>
</template>
