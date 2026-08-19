<script setup lang="ts">
import type { VolumeInspect } from '#shared/types/volume'
import { formatTimestamp } from '~/utils/format-timestamp'

const route = useRoute()
const name = computed(() => String(route.params.name || ''))
const dir = computed(() => typeof route.query.path === 'string' ? route.query.path : '')

useSeoMeta({
  title: () => name.value || 'Volume',
  description: 'Inspect a Docker volume and browse its files.'
})

const { data: volume, status, error, refresh } = await useFetch<VolumeInspect>(
  () => `/api/volumes/${encodeURIComponent(name.value)}`
)

const { listing, pending, error: filesError, refresh: refreshFiles } = useVolumeFiles(name, dir)

function openDirectory(nextPath: string) {
  navigateTo({
    path: `/volumes/${encodeURIComponent(name.value)}`,
    query: nextPath ? { path: nextPath } : {}
  })
}

async function refreshAll() {
  await Promise.all([refresh(), refreshFiles()])
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 space-y-2">
        <UButton
          to="/"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          label="All volumes"
          class="-ms-2"
        />
        <h1 class="font-display text-3xl tracking-tight">
          {{ name }}
        </h1>
        <p v-if="volume" class="text-sm text-muted">
          {{ volume.driver }} · created {{ formatTimestamp(volume.createdAt) }}
          <span v-if="volume.bound"> · bound via VOLUME_BIND</span>
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-refresh-cw"
        label="Refresh"
        :loading="status === 'pending' || pending"
        @click="refreshAll"
      />
    </header>

    <UAlert
      v-if="error"
      color="error"
      title="Could not inspect this volume"
      :description="error.message"
    />

    <template v-else-if="volume">
      <dl class="grid gap-4 rounded-lg border border-default p-4 sm:grid-cols-2">
        <div>
          <dt class="text-xs uppercase tracking-wider text-muted">Mountpoint</dt>
          <dd class="mt-1 break-all font-mono text-sm">{{ volume.mountpoint || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wider text-muted">Scope</dt>
          <dd class="mt-1 font-mono text-sm">{{ volume.scope }}</dd>
        </div>
      </dl>

      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-display text-xl">Files</h2>
          <UBadge v-if="listing" color="neutral" variant="subtle">
            via {{ listing.via === 'bind' ? 'VOLUME_PATH' : 'helper container' }}
          </UBadge>
        </div>

        <FilesFileBreadcrumbs :volume="name" :path="dir" />

        <UAlert
          v-if="filesError"
          color="error"
          title="Could not read this folder"
          :description="filesError.message"
        />

        <UEmpty
          v-else-if="!pending && listing && !listing.entries.length"
          icon="i-lucide-folder-open"
          title="This folder is empty"
          description="There are no files at this path in the volume."
        />

        <FilesFileBrowser
          v-else-if="listing"
          :volume="name"
          :path="dir"
          :entries="listing.entries"
          :loading="pending"
          @open-directory="openDirectory"
        />
      </section>
    </template>
  </div>
</template>
