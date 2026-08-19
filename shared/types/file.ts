export type VolumeEntryType = 'file' | 'directory'

export interface VolumeFileEntry {
  name: string
  path: string
  type: VolumeEntryType
  size: number
  modifiedAt: number
  binary: boolean
}

export interface VolumeFileListResponse {
  volume: string
  path: string
  parent: string | null
  entries: VolumeFileEntry[]
  via: 'host' | 'bind' | 'helper'
}

export interface VolumeFileReadResponse {
  volume: string
  path: string
  name: string
  size: number
  modifiedAt: number
  binary: boolean
  tooLarge: boolean
  language: string
  content: string | null
  via: 'host' | 'bind' | 'helper'
}

export interface VolumeFileWriteBody {
  path: string
  content: string
  expectedMtime?: number
}

export interface VolumeFileWriteResponse {
  path: string
  size: number
  modifiedAt: number
}
