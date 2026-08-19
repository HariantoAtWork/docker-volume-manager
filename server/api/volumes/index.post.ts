import { createVolume } from '../../utils/volume-ops'
import type { VolumeCreateBody, VolumeInspect } from '../../../shared/types/volume'

export default defineEventHandler(async (event): Promise<VolumeInspect> => {
  const body = await readBody<VolumeCreateBody>(event)
  if (!body?.name || typeof body.name !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Volume name is required' })
  }

  return createVolume({
    name: body.name.trim(),
    driver: body.driver?.trim() || 'local',
    labels: body.labels,
    driverOpts: body.driverOpts
  })
})
