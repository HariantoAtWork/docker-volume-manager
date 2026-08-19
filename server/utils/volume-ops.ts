import type { VolumeInspect, VolumePruneResponse, VolumeSummary } from '../../shared/types/volume'
import { getDocker } from './docker-client'
import { withDockerError } from './docker-error'
import { removeHelperForVolume } from './helper-container'
import { getVolumeRuntime } from './volume-config'
import { isValidVolumeName } from '../../shared/utils/volume-path'

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') {
    return {}
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => [k, v as string])
  )
}

function toSummary(raw: Record<string, unknown>, bound: string): VolumeSummary {
  const name = String(raw.Name || '')
  return {
    name,
    driver: String(raw.Driver || 'local'),
    mountpoint: String(raw.Mountpoint || ''),
    createdAt: String(raw.CreatedAt || ''),
    labels: asRecord(raw.Labels),
    options: asRecord(raw.Options),
    scope: String(raw.Scope || 'local'),
    bound: Boolean(bound) && name === bound
  }
}

export async function listVolumes(): Promise<{ volumes: VolumeSummary[], warnings: string[], bound: string }> {
  const { volumeBind } = getVolumeRuntime()
  const result = await withDockerError(() => getDocker().listVolumes(), 'Could not list volumes')
  const volumes = (result.Volumes ?? []).map(volume => toSummary(volume as unknown as Record<string, unknown>, volumeBind))
  volumes.sort((a, b) => a.name.localeCompare(b.name))
  return {
    volumes,
    warnings: result.Warnings ?? [],
    bound: volumeBind
  }
}

export async function inspectVolume(name: string): Promise<VolumeInspect> {
  if (!isValidVolumeName(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid volume name' })
  }
  const { volumeBind } = getVolumeRuntime()
  const raw = await withDockerError(
    () => getDocker().getVolume(name).inspect(),
    `Could not inspect volume ${name}`
  ) as unknown as Record<string, unknown>

  return {
    ...toSummary(raw, volumeBind),
    status: (raw.Status as Record<string, unknown> | null) ?? null,
    raw
  }
}

export async function createVolume(input: {
  name: string
  driver?: string
  labels?: Record<string, string>
  driverOpts?: Record<string, string>
}): Promise<VolumeInspect> {
  if (!isValidVolumeName(input.name)) {
    throw createError({ statusCode: 400, statusMessage: 'Volume name must match [a-zA-Z0-9][a-zA-Z0-9_.-]*' })
  }

  await withDockerError(
    () => getDocker().createVolume({
      Name: input.name,
      Driver: input.driver || 'local',
      Labels: input.labels,
      DriverOpts: input.driverOpts
    }),
    'Could not create volume'
  )

  return inspectVolume(input.name)
}

export async function removeVolume(name: string, force = false): Promise<void> {
  if (!isValidVolumeName(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid volume name' })
  }
  await removeHelperForVolume(name)
  await withDockerError(
    () => getDocker().getVolume(name).remove({ force }),
    `Could not remove volume ${name}`
  )
}

export async function pruneVolumes(): Promise<VolumePruneResponse> {
  const result = await withDockerError(
    () => getDocker().pruneVolumes(),
    'Could not prune unused volumes'
  )
  return {
    volumesDeleted: result.VolumesDeleted ?? [],
    spaceReclaimed: result.SpaceReclaimed ?? 0
  }
}
