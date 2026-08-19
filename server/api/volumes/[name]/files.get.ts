import { listVolumeFiles } from '../../../utils/volume-fs'
import { inspectVolume } from '../../../utils/volume-ops'
import type { VolumeFileListResponse } from '../../../../shared/types/file'

export default defineEventHandler(async (event): Promise<VolumeFileListResponse> => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Volume name is required' })
  }
  const volume = decodeURIComponent(name)
  await inspectVolume(volume)
  const query = getQuery(event)
  const path = typeof query.path === 'string' ? query.path : ''
  return listVolumeFiles(volume, path)
})
