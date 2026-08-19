import type { VolumeFileListResponse } from '#shared/types/file'

export async function useVolumeFiles(volume: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string>) {
  const request = await useFetch<VolumeFileListResponse>(() => `/api/volumes/${encodeURIComponent(toValue(volume))}/files`, {
    query: computed(() => ({ path: toValue(path) })),
    watch: [() => toValue(volume), () => toValue(path)]
  })

  return {
    listing: request.data,
    pending: computed(() => request.status.value === 'pending'),
    error: request.error,
    refresh: request.refresh
  }
}
