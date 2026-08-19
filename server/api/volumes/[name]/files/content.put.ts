import { writeVolumeFile } from '../../../../utils/volume-fs'
import { inspectVolume } from '../../../../utils/volume-ops'
import type { VolumeFileWriteBody, VolumeFileWriteResponse } from '../../../../../shared/types/file'

export default defineEventHandler(async (event): Promise<VolumeFileWriteResponse> => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Volume name is required' })
  }
  const volume = decodeURIComponent(name)
  await inspectVolume(volume)
  const body = await readBody<VolumeFileWriteBody>(event)
  if (!body?.path || typeof body.path !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'File path is required' })
  }
  if (typeof body.content !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'File content is required' })
  }
  return writeVolumeFile(volume, body.path, body.content, body.expectedMtime)
})
