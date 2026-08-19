import { inspectVolume } from '../../utils/volume-ops'
import type { VolumeInspect } from '../../../shared/types/volume'

export default defineEventHandler(async (event): Promise<VolumeInspect> => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Volume name is required' })
  }
  return inspectVolume(decodeURIComponent(name))
})
