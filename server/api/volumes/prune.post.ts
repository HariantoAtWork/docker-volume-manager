import { pruneVolumes } from '../../utils/volume-ops'
import type { VolumePruneResponse } from '../../../shared/types/volume'

export default defineEventHandler(async (): Promise<VolumePruneResponse> => {
  return pruneVolumes()
})
