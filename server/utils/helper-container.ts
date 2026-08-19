import { PassThrough } from 'node:stream'
import type Dockerode from 'dockerode'
import { getDocker } from './docker-client'
import { withDockerError } from './docker-error'
import { getVolumeRuntime } from './volume-config'
import { isValidVolumeName } from '../../shared/utils/volume-path'

const HELPER_LABEL = 'com.docker-volume-manager.helper'

function helperNameFor(volumeName: string): string {
  const safe = volumeName.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 200)
  return `dvm-h-${safe}`
}

export async function execCommand(
  container: Dockerode.Container,
  cmd: string[],
  options?: { stdin?: Buffer }
): Promise<{ stdout: Buffer, stderr: Buffer, exitCode: number }> {
  const docker = getDocker()
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
    AttachStdin: Boolean(options?.stdin)
  })

  const stream = await exec.start({
    hijack: true,
    stdin: Boolean(options?.stdin)
  }) as NodeJS.ReadableStream & NodeJS.WritableStream

  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const outChunks: Buffer[] = []
  const errChunks: Buffer[] = []
  stdout.on('data', (chunk: Buffer) => outChunks.push(chunk))
  stderr.on('data', (chunk: Buffer) => errChunks.push(chunk))
  docker.modem.demuxStream(stream, stdout, stderr)

  const finished = new Promise<void>((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  if (options?.stdin) {
    stream.write(options.stdin)
    ;(stream as NodeJS.WritableStream).end()
  }

  await finished
  stdout.end()
  stderr.end()

  const inspect = await exec.inspect()
  return {
    stdout: Buffer.concat(outChunks),
    stderr: Buffer.concat(errChunks),
    exitCode: inspect.ExitCode ?? 0
  }
}

async function ensureHelperImage(): Promise<void> {
  const docker = getDocker()
  const { helperImage } = getVolumeRuntime()

  try {
    await docker.getImage(helperImage).inspect()
    return
  }
  catch {
    // pull below
  }

  const stream = await withDockerError(
    () => docker.pull(helperImage),
    `Could not pull helper image ${helperImage}`
  )

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(stream, (error) => {
      if (error) {
        reject(error)
      }
      else {
        resolve()
      }
    })
  })
}

export async function removeHelperForVolume(volumeName: string): Promise<void> {
  const docker = getDocker()
  try {
    await docker.getContainer(helperNameFor(volumeName)).remove({ force: true })
  }
  catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode !== 404) {
      throw error
    }
  }
}

export async function getHelperContainer(volumeName: string): Promise<Dockerode.Container> {
  if (!isValidVolumeName(volumeName)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid volume name' })
  }

  const docker = getDocker()
  const { helperImage } = getVolumeRuntime()
  const name = helperNameFor(volumeName)

  try {
    const existing = docker.getContainer(name)
    const info = await existing.inspect()
    if (!info.State.Running) {
      await existing.start()
    }
    return existing
  }
  catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode && statusCode !== 404) {
      throw error
    }
  }

  await ensureHelperImage()

  try {
    const created = await docker.createContainer({
      Image: helperImage,
      name,
      Cmd: ['sleep', 'infinity'],
      Labels: {
        [HELPER_LABEL]: '1',
        'com.docker-volume-manager.volume': volumeName
      },
      HostConfig: {
        Binds: [`${volumeName}:/data:rw`]
      }
    })
    await created.start()
    return created
  }
  catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 409) {
      const existing = docker.getContainer(name)
      const info = await existing.inspect()
      if (!info.State.Running) {
        await existing.start()
      }
      return existing
    }
    throw error
  }
}
