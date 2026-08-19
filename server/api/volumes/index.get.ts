import { listVolumes } from '../../utils/volume-ops'
import type { VolumeListResponse } from '../../../shared/types/volume'

export default defineEventHandler(async (): Promise<VolumeListResponse> => {
  return listVolumes()
})
