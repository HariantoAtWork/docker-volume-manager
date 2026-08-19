<script setup lang="ts">
const {
  name,
  driver = 'local',
  bound = false
} = defineProps<{
  name: string
  driver?: string
  bound?: boolean
}>()
</script>

<template>
  <span class="cargo-tag" :title="name">
    <span class="cargo-tag__name">{{ name }}</span>
    <span class="cargo-tag__port">{{ driver }}</span>
    <span v-if="bound" class="cargo-tag__bound">bound</span>
  </span>
</template>
