import { readVolumeFile } from '../../../../utils/volume-fs'
import { inspectVolume } from '../../../../utils/volume-ops'
import type { VolumeFileReadResponse } from '../../../../../shared/types/file'

export default defineEventHandler(async (event): Promise<VolumeFileReadResponse> => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Volume name is required' })
  }
  const volume = decodeURIComponent(name)
  await inspectVolume(volume)
  const query = getQuery(event)
  const path = typeof query.path === 'string' ? query.path : ''
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'File path is required' })
  }
  return readVolumeFile(volume, path)
})
