<script setup lang="ts">
const { volume, path } = defineProps<{
  volume: string
  path: string
}>()

const crumbs = computed(() => {
  const parts = path.split('/').filter(Boolean)
  const items = [
    {
      label: volume,
      to: `/volumes/${encodeURIComponent(volume)}`
    }
  ]
  let acc = ''
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part
    items.push({
      label: part,
      to: `/volumes/${encodeURIComponent(volume)}?path=${encodeURIComponent(acc)}`
    })
  }
  return items
})
</script>

<template>
  <UBreadcrumb :items="crumbs" class="min-w-0">
    <template #item="{ item, index }">
      <span :class="index === 0 ? 'font-mono text-xs' : 'font-mono text-sm'">
        {{ item.label }}
      </span>
    </template>
  </UBreadcrumb>
</template>
