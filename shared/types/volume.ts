export interface VolumeSummary {
  name: string
  driver: string
  mountpoint: string
  createdAt: string
  labels: Record<string, string>
  options: Record<string, string>
  scope: string
  bound: boolean
}

export interface VolumeInspect extends VolumeSummary {
  status: Record<string, unknown> | null
  raw: Record<string, unknown>
}

export interface VolumeListResponse {
  volumes: VolumeSummary[]
  warnings: string[]
  bound: string
}

export interface VolumeCreateBody {
  name: string
  driver?: string
  labels?: Record<string, string>
  driverOpts?: Record<string, string>
}

export interface VolumePruneResponse {
  volumesDeleted: string[]
  spaceReclaimed: number
}

export interface AppConfigResponse {
  volumeBind: string
  volumePath: string
  volumePathMounted: boolean
  helperImage: string
  docker: {
    ok: boolean
    version?: string
    error?: string
  }
}
