<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

const emit = defineEmits<{
  created: [name: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const pending = ref(false)
const state = reactive({
  name: '',
  driver: 'local'
})

watch(open, (value) => {
  if (value) {
    state.name = ''
    state.driver = 'local'
  }
})

async function onSubmit(_event: FormSubmitEvent<typeof state>) {
  pending.value = true
  try {
    await $fetch('/api/volumes', {
      method: 'POST',
      body: {
        name: state.name.trim(),
        driver: state.driver.trim() || 'local'
      }
    })
    toast.add({
      title: 'Volume created',
      description: state.name.trim(),
      color: 'success',
      icon: 'i-lucide-check'
    })
    open.value = false
    emit('created', state.name.trim())
  }
  catch (error) {
    toast.add({
      title: 'Could not create volume',
      description: error instanceof Error ? error.message : 'Docker rejected the request',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create volume"
    description="Adds a named volume on this Docker engine."
  >
    <template #body>
      <UForm :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="name" label="Name" required hint="Letters, numbers, _, . and -">
          <UInput
            v-model="state.name"
            autofocus
            placeholder="app-data"
            class="w-full"
          />
        </UFormField>
        <UFormField name="driver" label="Driver">
          <UInput
            v-model="state.driver"
            placeholder="local"
            class="w-full"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Create volume"
            :loading="pending"
            :disabled="!state.name.trim()"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
