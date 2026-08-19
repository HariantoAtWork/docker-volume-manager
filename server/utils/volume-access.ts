import { access, constants, stat } from 'node:fs/promises'
import path from 'node:path'
import { getDocker } from './docker-client'
import { getVolumeRuntime } from './volume-config'
import { isValidVolumeName } from '../../shared/utils/volume-path'

export type VolumeFileVia = 'host' | 'bind' | 'helper'

export interface DirectVolumeAccess {
  root: string
  via: Exclude<VolumeFileVia, 'helper'>
}

const DEFAULT_VOLUMES_DIR = '/var/lib/docker/volumes'

export async function isReadableDir(target: string): Promise<boolean> {
  try {
    await access(target, constants.R_OK)
    return (await stat(target)).isDirectory()
  }
  catch {
    return false
  }
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of paths) {
    const normalised = path.resolve(item)
    if (seen.has(normalised)) {
      continue
    }
    seen.add(normalised)
    result.push(normalised)
  }
  return result
}

export function hostVolumeDirCandidates(): string[] {
  const { dockerVolumesDir } = getVolumeRuntime()
  return uniquePaths([
    dockerVolumesDir,
    DEFAULT_VOLUMES_DIR,
    `/proc/1/root${DEFAULT_VOLUMES_DIR}`
  ].filter(Boolean))
}

export async function isHostVolumesAccessible(): Promise<boolean> {
  for (const dir of hostVolumeDirCandidates()) {
    if (await isReadableDir(dir)) {
      return true
    }
  }
  return false
}

export async function isVolumePathMounted(): Promise<boolean> {
  const { volumePath } = getVolumeRuntime()
  if (!volumePath) {
    return false
  }
  return isReadableDir(volumePath)
}

function dataDirFor(volumesDir: string, volumeName: string): string {
  return path.join(volumesDir, volumeName, '_data')
}

export async function resolveDirectAccess(volumeName: string): Promise<DirectVolumeAccess | null> {
  if (!isValidVolumeName(volumeName)) {
    return null
  }

  const { volumeBind, volumePath } = getVolumeRuntime()

  for (const volumesDir of hostVolumeDirCandidates()) {
    const root = dataDirFor(volumesDir, volumeName)
    if (await isReadableDir(root)) {
      return { root, via: 'host' }
    }
  }

  try {
    const inspect = await getDocker().getVolume(volumeName).inspect()
    const mountpoint = String(inspect.Mountpoint || '')
    if (mountpoint.startsWith('/') && await isReadableDir(mountpoint)) {
      return { root: path.resolve(mountpoint), via: 'host' }
    }
    if (mountpoint.startsWith('/') && await isReadableDir(`/proc/1/root${mountpoint}`)) {
      return { root: path.resolve(`/proc/1/root${mountpoint}`), via: 'host' }
    }
  }
  catch {
    // Socket or inspect can fail during local setup; fall through to bind/helper.
  }

  if (volumeBind && volumeName === volumeBind && volumePath && await isReadableDir(volumePath)) {
    return { root: path.resolve(volumePath), via: 'bind' }
  }

  return null
}
