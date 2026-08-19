<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { VolumeInspect, VolumeSummary } from '../../../shared/types/volume'
import CargoTag from './CargoTag.vue'
import { formatTimestamp } from '../../utils/format-timestamp'

const { volumes, loading = false } = defineProps<{
  volumes: VolumeSummary[]
  loading?: boolean
}>()

const emit = defineEmits<{
  inspect: [volume: VolumeInspect]
  remove: [volume: VolumeSummary]
}>()

const toast = useToast()
const inspecting = ref(false)

const columns: TableColumn<VolumeSummary>[] = [
  {
    accessorKey: 'name',
    header: 'Volume'
  },
  {
    accessorKey: 'mountpoint',
    header: 'Mountpoint'
  },
  {
    accessorKey: 'createdAt',
    header: 'Created'
  },
  {
    id: 'actions',
    header: ''
  }
]

async function inspect(volume: VolumeSummary) {
  inspecting.value = true
  try {
    const detail = await $fetch<VolumeInspect>(`/api/volumes/${encodeURIComponent(volume.name)}`)
    emit('inspect', detail)
  }
  catch (error) {
    toast.add({
      title: 'Inspect failed',
      description: error instanceof Error ? error.message : 'Could not inspect this volume',
      color: 'error'
    })
  }
  finally {
    inspecting.value = false
  }
}

function actionsFor(volume: VolumeSummary) {
  return [
    {
      label: 'Browse files',
      icon: 'i-lucide-folder-open',
      to: `/volumes/${encodeURIComponent(volume.name)}`
    },
    {
      label: 'Inspect',
      icon: 'i-lucide-search',
      onSelect: () => {
        inspect(volume)
      }
    },
    { type: 'separator' as const },
    {
      label: 'Remove',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => emit('remove', volume)
    }
  ]
}
</script>

<template>
  <UTable
    :data="volumes"
    :columns="columns"
    :loading="loading || inspecting"
    sticky
    class="shrink-0"
  >
    <template #name-cell="{ row }">
      <NuxtLink
        :to="`/volumes/${encodeURIComponent(row.original.name)}`"
        class="inline-flex min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <CargoTag
          :name="row.original.name"
          :driver="row.original.driver"
          :bound="row.original.bound"
        />
      </NuxtLink>
    </template>

    <template #mountpoint-cell="{ row }">
      <span class="block max-w-md truncate font-mono text-xs text-muted" :title="row.original.mountpoint">
        {{ row.original.mountpoint || '—' }}
      </span>
    </template>

    <template #createdAt-cell="{ row }">
      <span class="font-mono text-xs">{{ formatTimestamp(row.original.createdAt) }}</span>
    </template>

    <template #actions-cell="{ row }">
      <div class="flex justify-end gap-1">
        <UButton
          icon="i-lucide-folder-open"
          color="neutral"
          variant="ghost"
          size="xs"
          :to="`/volumes/${encodeURIComponent(row.original.name)}`"
          aria-label="Browse files"
        />
        <UDropdownMenu :items="actionsFor(row.original)">
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            aria-label="Volume actions"
          />
        </UDropdownMenu>
      </div>
    </template>
  </UTable>
</template>
