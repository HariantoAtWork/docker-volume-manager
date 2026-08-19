<script setup lang="ts">
import type { VolumeFileReadResponse, VolumeFileWriteResponse } from '#shared/types/file'
import { formatBytes } from '~/utils/format-bytes'

const route = useRoute()
const toast = useToast()
const name = computed(() => String(route.params.name || ''))
const filePath = computed(() => typeof route.query.path === 'string' ? route.query.path : '')

useSeoMeta({
  title: () => filePath.value.split('/').at(-1) || 'Edit file',
  description: 'Edit a file inside a Docker volume.'
})

const { data: file, status, error, refresh } = await useFetch<VolumeFileReadResponse>(
  () => `/api/volumes/${encodeURIComponent(name.value)}/files/content`,
  {
    query: computed(() => ({ path: filePath.value })),
    watch: [name, filePath]
  }
)

const draft = ref('')
const original = ref('')
const saving = ref(false)
const overwriteOpen = ref(false)
const overwriteForce = ref(false)

watch(file, (next) => {
  if (next?.content != null) {
    draft.value = next.content
    original.value = next.content
  }
}, { immediate: true })

const dirty = computed(() => draft.value !== original.value)
const canEdit = computed(() => Boolean(file.value && !file.value.binary && !file.value.tooLarge && file.value.content != null))

function parentHref() {
  const parts = filePath.value.split('/').filter(Boolean)
  parts.pop()
  const parent = parts.join('/')
  return {
    path: `/volumes/${encodeURIComponent(name.value)}`,
    query: parent ? { path: parent } : {}
  }
}

function downloadHref() {
  return `/api/volumes/${encodeURIComponent(name.value)}/files/download?path=${encodeURIComponent(filePath.value)}`
}

async function persist(force = false) {
  if (!file.value || !canEdit.value) {
    return
  }
  saving.value = true
  try {
    const result = await $fetch<VolumeFileWriteResponse>(
      `/api/volumes/${encodeURIComponent(name.value)}/files/content`,
      {
        method: 'PUT',
        body: {
          path: filePath.value,
          content: draft.value,
          expectedMtime: force ? undefined : file.value.modifiedAt
        }
      }
    )
    original.value = draft.value
    if (file.value) {
      file.value.modifiedAt = result.modifiedAt
      file.value.size = result.size
    }
    overwriteOpen.value = false
    toast.add({
      title: 'Saved changes',
      description: file.value.name,
      color: 'success',
      icon: 'i-lucide-check'
    })
  }
  catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 409) {
      overwriteOpen.value = true
      return
    }
    toast.add({
      title: 'Could not save',
      description: err instanceof Error ? err.message : 'Write failed',
      color: 'error'
    })
  }
  finally {
    saving.value = false
  }
}

function requestSave() {
  if (!dirty.value) {
    return
  }
  persist(overwriteForce.value)
}

onBeforeRouteLeave(() => {
  if (!dirty.value) {
    return true
  }
  return window.confirm('You have unsaved changes. Leave without saving?')
})
</script>

<template>
  <div class="flex min-h-[70vh] flex-col gap-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <UButton
          :to="parentHref()"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          label="Back to folder"
          class="-ms-2"
        />
        <h1 class="truncate font-display text-2xl tracking-tight">
          {{ file?.name || filePath }}
        </h1>
        <p v-if="file" class="font-mono text-xs text-muted">
          {{ file.path }} · {{ formatBytes(file.size) }} · {{ file.language }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          :href="downloadHref()"
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          label="Download"
          external
        />
        <UButton
          v-if="canEdit"
          icon="i-lucide-save"
          label="Save changes"
          :disabled="!dirty"
          :loading="saving"
          @click="requestSave"
        />
      </div>
    </header>

    <UAlert
      v-if="error"
      color="error"
      title="Could not open this file"
      :description="error.message"
    />

    <UAlert
      v-else-if="file?.binary"
      color="warning"
      icon="i-lucide-file-warning"
      title="Binary file"
      description="This file is not text, so it cannot be edited here. Download it instead."
    />

    <UAlert
      v-else-if="file?.tooLarge"
      color="warning"
      icon="i-lucide-file-warning"
      title="File is too large to edit"
      description="The editor opens files up to 2 MB. Download the file to work with it locally."
    />

    <div v-else-if="status === 'pending'" class="space-y-2">
      <USkeleton class="h-8 w-1/3" />
      <USkeleton class="h-[28rem] w-full" />
    </div>

    <ClientOnly v-else-if="canEdit">
      <FilesFileCodeEditor
        v-model="draft"
        :language="file?.language || 'plaintext'"
        class="min-h-[28rem] flex-1"
        @save="requestSave"
      />
      <template #fallback>
        <USkeleton class="h-[28rem] w-full" />
      </template>
    </ClientOnly>

    <UModal
      v-model:open="overwriteOpen"
      title="Overwrite newer file?"
      description="The file on disk has changed since you opened it. Saving will replace that version."
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="overwriteOpen = false" />
          <UButton
            color="warning"
            label="Overwrite file"
            :loading="saving"
            @click="persist(true)"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
