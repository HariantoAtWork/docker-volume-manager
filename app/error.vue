<script setup lang="ts">
import type { NuxtError } from '#app'

const { error } = defineProps<{
  error: NuxtError
}>()

useSeoMeta({
  title: 'Something went wrong'
})
</script>

<template>
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
