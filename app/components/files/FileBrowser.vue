<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { VolumeFileEntry } from '#shared/types/file'
import { formatBytes } from '~/utils/format-bytes'
import { formatTimestamp } from '~/utils/format-timestamp'

const { volume, entries, loading = false } = defineProps<{
  volume: string
  path: string
  entries: VolumeFileEntry[]
  loading?: boolean
}>()

const emit = defineEmits<{
  openDirectory: [path: string]
}>()

const filter = ref('')

const visible = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) {
    return entries
  }
  return entries.filter(entry => entry.name.toLowerCase().includes(q))
})

const columns: TableColumn<VolumeFileEntry>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'size', header: 'Size' },
  { accessorKey: 'modifiedAt', header: 'Modified' },
  { id: 'actions', header: '' }
]

function iconFor(entry: VolumeFileEntry): string {
  if (entry.type === 'directory') {
    return 'i-lucide-folder'
  }
  if (entry.binary) {
    return 'i-lucide-file-archive'
  }
  return 'i-lucide-file-code-2'
}

function open(entry: VolumeFileEntry) {
  if (entry.type === 'directory') {
    emit('openDirectory', entry.path)
    return
  }
  navigateTo({
    path: `/volumes/${encodeURIComponent(volume)}/edit`,
    query: { path: entry.path }
  })
}

function downloadUrl(entry: VolumeFileEntry): string {
  return `/api/volumes/${encodeURIComponent(volume)}/files/download?path=${encodeURIComponent(entry.path)}`
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="filter"
        icon="i-lucide-search"
        placeholder="Filter this folder"
        class="w-full max-w-sm"
        aria-label="Filter files"
      />
      <p class="text-xs text-muted">
        {{ visible.length }} of {{ entries.length }}
      </p>
    </div>

    <UTable
      :data="visible"
      :columns="columns"
      :loading="loading"
      sticky
    >
      <template #name-cell="{ row }">
        <button
          type="button"
          class="flex min-w-0 items-center gap-2 text-left text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="open(row.original)"
        >
          <UIcon
            :name="iconFor(row.original)"
            class="size-4 shrink-0"
            :class="row.original.type === 'directory' ? 'text-primary' : 'text-muted'"
          />
          <span class="truncate font-mono text-sm underline-offset-4 hover:underline">{{ row.original.name }}</span>
        </button>
      </template>

      <template #size-cell="{ row }">
        <span class="font-mono text-xs text-muted">
          {{ row.original.type === 'directory' ? '—' : formatBytes(row.original.size) }}
        </span>
      </template>

      <template #modifiedAt-cell="{ row }">
        <span class="font-mono text-xs">{{ formatTimestamp(row.original.modifiedAt) }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            v-if="row.original.type === 'file'"
            icon="i-lucide-download"
            color="neutral"
            variant="ghost"
            size="xs"
            :to="downloadUrl(row.original)"
            external
            :download="row.original.name"
            aria-label="Download file"
          />
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Open"
            @click="open(row.original)"
          />
        </div>
      </template>
    </UTable>
  </div>
</template>
