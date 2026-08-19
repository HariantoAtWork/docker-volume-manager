import { existsSync } from 'node:fs'
import Dockerode from 'dockerode'
import { getVolumeRuntime } from './volume-config'

let client: Dockerode | null = null

function parseDockerHost(host: string): Dockerode.DockerOptions {
  if (host.startsWith('unix://')) {
    return { socketPath: host.slice('unix://'.length) }
  }

  const url = new URL(host.includes('://') ? host : `tcp://${host}`)
  const protocol = url.protocol.replace(':', '')
  const mappedProtocol = protocol === 'tcp' ? 'http' : protocol
  const port = url.port
    ? Number(url.port)
    : mappedProtocol === 'https'
      ? 2376
      : 2375

  return {
    protocol: mappedProtocol as Dockerode.DockerOptions['protocol'],
    host: url.hostname,
    port
  }
}

function resolveSocketPath(preferred: string): string {
  const candidates = [
    preferred,
    '/var/run/docker.sock',
    '/proc/1/root/var/run/docker.sock'
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return preferred || '/var/run/docker.sock'
}

export function createDockerClient(): Dockerode {
  const { dockerSocket, dockerHost } = getVolumeRuntime()

  if (dockerSocket || !dockerHost) {
    return new Dockerode({ socketPath: resolveSocketPath(dockerSocket) })
  }

  try {
    return new Dockerode(parseDockerHost(dockerHost))
  }
  catch {
    return new Dockerode({ socketPath: resolveSocketPath('') })
  }
}

export function getDocker(): Dockerode {
  if (!client) {
    client = createDockerClient()
  }
  return client
}

export async function dockerVersion(): Promise<string> {
  const info = await getDocker().version()
  return info.Version || 'unknown'
}
