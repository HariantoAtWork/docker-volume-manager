<script setup lang="ts">
import type { AppConfigResponse, VolumeInspect, VolumePruneResponse, VolumeSummary } from '#shared/types/volume'
import { formatBytes } from '~/utils/format-bytes'

useSeoMeta({
  title: 'Volumes',
  description: 'List, create, inspect and prune Docker volumes.'
})

const toast = useToast()
const { volumes, warnings, pending, error, refresh } = useVolumes()
const { data: appConfig } = await useFetch<AppConfigResponse>('/api/config')

const query = ref('')
const createOpen = ref(false)
const pruneOpen = ref(false)
const prunePending = ref(false)
const inspectOpen = ref(false)
const inspected = ref<VolumeInspect | null>(null)
const removeOpen = ref(false)
const removePending = ref(false)
const removing = ref<VolumeSummary | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) {
    return volumes.value
  }
  return volumes.value.filter(volume =>
    volume.name.toLowerCase().includes(q)
    || volume.driver.toLowerCase().includes(q)
    || volume.mountpoint.toLowerCase().includes(q)
  )
})

function openInspect(volume: VolumeInspect) {
  inspected.value = volume
  inspectOpen.value = true
}

function openRemove(volume: VolumeSummary) {
  removing.value = volume
  removeOpen.value = true
}

async function confirmRemove() {
  if (!removing.value) {
    return
  }
  removePending.value = true
  try {
    await $fetch(`/api/volumes/${encodeURIComponent(removing.value.name)}`, { method: 'DELETE' })
    toast.add({
      title: 'Volume removed',
      description: removing.value.name,
      color: 'success',
      icon: 'i-lucide-check'
    })
    removeOpen.value = false
    removing.value = null
    await refresh()
  }
  catch (err) {
    toast.add({
      title: 'Could not remove volume',
      description: err instanceof Error ? err.message : 'The volume may still be in use',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
  finally {
    removePending.value = false
  }
}

async function confirmPrune() {
  prunePending.value = true
  try {
    const result = await $fetch<VolumePruneResponse>('/api/volumes/prune', { method: 'POST' })
    const count = result.volumesDeleted.length
    toast.add({
      title: count ? 'Unused volumes pruned' : 'Nothing to prune',
      description: count
        ? `${count} removed, ${formatBytes(result.spaceReclaimed)} reclaimed`
        : 'Every volume is still attached to a container',
      color: 'success',
      icon: 'i-lucide-check'
    })
    pruneOpen.value = false
    await refresh()
  }
  catch (err) {
    toast.add({
      title: 'Prune failed',
      description: err instanceof Error ? err.message : 'Docker rejected the request',
      color: 'error'
    })
  }
  finally {
    prunePending.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-[11px] uppercase tracking-[0.22em] text-primary">
          Manifest
        </p>
        <h1 class="font-display text-3xl tracking-tight">
          Volumes
        </h1>
        <p class="mt-1 max-w-xl text-sm text-muted">
          Named cargo on this engine. Bind one with
          <code class="font-mono text-xs">VOLUME_BIND</code>
          to browse it from disk, or open any volume through a helper container.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-eraser"
          label="Prune unused"
          @click="pruneOpen = true"
        />
        <UButton
          icon="i-lucide-plus"
          label="Create volume"
          @click="createOpen = true"
        />
      </div>
    </header>

    <UAlert
      v-if="appConfig && !appConfig.docker.ok"
      color="error"
      icon="i-lucide-unplug"
      title="Docker daemon unreachable"
      :description="appConfig.docker.error || 'Check DOCKER_SOCKET or DOCKER_HOST, and that this process can read the socket.'"
    />

    <UAlert
      v-else-if="appConfig?.volumeBind && !appConfig.volumePathMounted"
      color="info"
      icon="i-lucide-info"
      title="Bound volume uses a helper container"
      :description="`${appConfig.volumeBind} is selected, but VOLUME_PATH is not mounted here. File browsing still works via ${appConfig.helperImage}.`"
    />

    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="query"
        icon="i-lucide-search"
        placeholder="Filter by name, driver or mountpoint"
        class="w-full max-w-md"
        aria-label="Filter volumes"
      />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        label="Refresh"
        :loading="pending"
        @click="() => refresh()"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      title="Could not list volumes"
      :description="error.message"
    />

    <UAlert
      v-for="warning in warnings"
      :key="warning"
      color="warning"
      :title="warning"
    />

    <UEmpty
      v-if="!pending && !filtered.length"
      icon="i-lucide-container"
      title="No volumes on this engine"
      description="Create a named volume, or set VOLUME_BIND to the volume you want to browse."
      :actions="[{ label: 'Create volume', onClick: () => { createOpen = true } }]"
    />

    <VolumesVolumeTable
      v-else
      :volumes="filtered"
      :loading="pending"
      @inspect="openInspect"
      @remove="openRemove"
    />

    <VolumesCreateVolumeModal v-model:open="createOpen" @created="refresh()" />
    <VolumesPruneVolumesModal v-model:open="pruneOpen" :loading="prunePending" @confirm="confirmPrune" />
    <VolumesInspectSlideover v-model:open="inspectOpen" :volume="inspected" />
    <VolumesRemoveVolumeModal
      v-model:open="removeOpen"
      :name="removing?.name ?? ''"
      :loading="removePending"
      @confirm="confirmRemove"
      @cancel="removeOpen = false"
    />
  </div>
</template>
