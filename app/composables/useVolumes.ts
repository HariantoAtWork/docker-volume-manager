import type { VolumeListResponse, VolumeSummary } from '#shared/types/volume'

export function useVolumes() {
  const request = useFetch<VolumeListResponse>('/api/volumes', {
    key: 'volumes'
  })

  const volumes = computed<VolumeSummary[]>(() => request.data.value?.volumes ?? [])
  const warnings = computed(() => request.data.value?.warnings ?? [])
  const bound = computed(() => request.data.value?.bound ?? '')

  return {
    volumes,
    warnings,
    bound,
    pending: computed(() => request.status.value === 'pending'),
    error: request.error,
    refresh: request.refresh
  }
}
