<script setup lang="ts">
const {
  name,
  loading = false
} = defineProps<{
  name: string
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Remove volume"
    :description="`This deletes ${name} from the engine. Data in the volume is lost.`"
  >
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="emit('cancel')"
        />
        <UButton
          color="error"
          label="Remove volume"
          :loading="loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
