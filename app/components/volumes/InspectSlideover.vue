<script setup lang="ts">
import type { VolumeInspect } from '../../../shared/types/volume'

const { volume } = defineProps<{
  volume: VolumeInspect | null
}>()

const open = defineModel<boolean>('open', { required: true })

const pretty = computed(() => {
  if (!volume) {
    return ''
  }
  return JSON.stringify(volume.raw, null, 2)
})
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Inspect volume"
    :description="volume?.name"
    side="right"
  >
    <template v-if="volume" #body>
      <dl class="grid gap-3 text-sm">
        <div>
          <dt class="text-muted">Driver</dt>
          <dd class="font-mono">{{ volume.driver }}</dd>
        </div>
        <div>
          <dt class="text-muted">Mountpoint</dt>
          <dd class="break-all font-mono text-xs">{{ volume.mountpoint || '—' }}</dd>
        </div>
        <div>
          <dt class="text-muted">Created</dt>
          <dd class="font-mono">{{ volume.createdAt || '—' }}</dd>
        </div>
        <div>
          <dt class="text-muted">Scope</dt>
          <dd class="font-mono">{{ volume.scope }}</dd>
        </div>
      </dl>
      <pre class="mt-6 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{{ pretty }}</pre>
    </template>
  </USlideover>
</template>
