<script setup lang="ts">
import RoomStatusBanners from './RoomStatusBanners.vue'
</script>

<template>
  <Story title="RoomStatusBanners" :layout="{ type: 'grid', width: 420 }">
    <Variant title="All good (shows nothing)">
      <RoomStatusBanners connection="open" host-alive relay-name="Alice" />
    </Variant>
    <Variant title="Lost connection">
      <RoomStatusBanners connection="connecting" host-alive relay-name="Alice" />
    </Variant>
    <Variant title="Creator's tab gone">
      <RoomStatusBanners connection="open" :host-alive="false" relay-name="Alice" />
    </Variant>
    <Variant title="Room closed">
      <RoomStatusBanners connection="open" host-alive relay-name="Alice" closed />
    </Variant>
  </Story>
</template>
