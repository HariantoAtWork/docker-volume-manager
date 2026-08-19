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

export function createDockerClient(): Dockerode {
  const { dockerSocket, dockerHost } = getVolumeRuntime()

  if (dockerSocket) {
    return new Dockerode({ socketPath: dockerSocket })
  }

  if (dockerHost) {
    try {
      return new Dockerode(parseDockerHost(dockerHost))
    }
    catch {
      return new Dockerode({ socketPath: '/var/run/docker.sock' })
    }
  }

  return new Dockerode({ socketPath: '/var/run/docker.sock' })
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
