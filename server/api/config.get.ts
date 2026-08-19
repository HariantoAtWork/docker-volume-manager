import { dockerVersion, getDocker } from '../utils/docker-client'
import { getVolumeRuntime } from '../utils/volume-config'
import { isVolumePathMounted } from '../utils/volume-fs'
import type { AppConfigResponse } from '../../shared/types/volume'

export default defineEventHandler(async (): Promise<AppConfigResponse> => {
  const runtime = getVolumeRuntime()
  const volumePathMounted = await isVolumePathMounted()

  try {
    await getDocker().ping()
    const version = await dockerVersion()
    return {
      volumeBind: runtime.volumeBind,
      volumePath: runtime.volumePath,
      volumePathMounted,
      helperImage: runtime.helperImage,
      docker: { ok: true, version }
    }
  }
  catch (error) {
    return {
      volumeBind: runtime.volumeBind,
      volumePath: runtime.volumePath,
      volumePathMounted,
      helperImage: runtime.helperImage,
      docker: {
        ok: false,
        error: error instanceof Error ? error.message : 'Cannot reach the Docker daemon'
      }
    }
  }
})
