import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { VolumeFileEntry, VolumeFileListResponse, VolumeFileReadResponse, VolumeFileWriteResponse } from '../../shared/types/file'
import { fileNameFromPath, joinVolumePath, parentVolumePath, toPosixPath } from '../../shared/utils/volume-path'
import { isBinaryBuffer, isProbablyBinaryName, languageFromPath } from '../../shared/utils/file-meta'
import { execCommand, getHelperContainer } from './helper-container'
import { resolveDirectAccess } from './volume-access'
import { withDockerError } from './docker-error'

export const MAX_EDIT_BYTES = 2 * 1024 * 1024

const LIST_SCRIPT = `
dir="$1"
if [ ! -e "$dir" ]; then
  echo "ENOENT" >&2
  exit 2
fi
if [ ! -d "$dir" ]; then
  echo "ENOTDIR" >&2
  exit 20
fi
ls -1A "$dir" 2>/dev/null | while IFS= read -r name; do
  p="$dir/$name"
  if [ -d "$p" ]; then
    t=directory
  else
    t=file
  fi
  size=$(stat -c '%s' "$p" 2>/dev/null || echo 0)
  mtime=$(stat -c '%Y' "$p" 2>/dev/null || echo 0)
  encoded=$(printf '%s' "$name" | base64 | tr -d '\\n')
  printf '%s\\t%s\\t%s\\t%s\\n' "$t" "$size" "$mtime" "$encoded"
done
`.trim()

function resolveUnderRoot(root: string, relative: string): string {
  const posix = toPosixPath(relative)
  const resolved = path.resolve(root, posix)
  const base = path.resolve(root)
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw createError({ statusCode: 400, statusMessage: 'Path must stay inside the volume' })
  }
  return resolved
}

function containerDataPath(relative: string): string {
  const posix = toPosixPath(relative)
  return posix ? `/data/${posix}` : '/data'
}

function mapHelperExit(exitCode: number, stderr: string, fallback: string): never {
  if (exitCode === 2 || stderr.includes('ENOENT')) {
    throw createError({ statusCode: 404, statusMessage: 'Path not found in volume' })
  }
  if (exitCode === 20 || stderr.includes('ENOTDIR')) {
    throw createError({ statusCode: 400, statusMessage: 'Path is not a directory' })
  }
  throw createError({ statusCode: 500, statusMessage: stderr.trim() || fallback })
}

async function listViaFs(
  volume: string,
  relative: string,
  root: string,
  via: 'host' | 'bind'
): Promise<VolumeFileListResponse> {
  const dir = resolveUnderRoot(root, relative)
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  }
  catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: 'Path not found in volume' })
    }
    if (code === 'ENOTDIR') {
      throw createError({ statusCode: 400, statusMessage: 'Path is not a directory' })
    }
    throw error
  }

  const mapped: VolumeFileEntry[] = []
  for (const entry of entries) {
    const childRelative = joinVolumePath(relative, entry.name)
    const childPath = path.join(dir, entry.name)
    let info
    try {
      info = await stat(childPath)
    }
    catch {
      continue
    }
    const isDirectory = entry.isDirectory() || info.isDirectory()
    mapped.push({
      name: entry.name,
      path: childRelative,
      type: isDirectory ? 'directory' : 'file',
      size: isDirectory ? 0 : info.size,
      modifiedAt: Math.floor(info.mtimeMs / 1000),
      binary: !isDirectory && isProbablyBinaryName(entry.name)
    })
  }

  mapped.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

  return {
    volume,
    path: toPosixPath(relative),
    parent: parentVolumePath(relative),
    entries: mapped,
    via
  }
}

async function listViaHelper(volume: string, relative: string): Promise<VolumeFileListResponse> {
  const container = await withDockerError(() => getHelperContainer(volume), 'Could not attach to volume')
  const target = containerDataPath(relative)
  const result = await execCommand(container, ['/bin/sh', '-c', LIST_SCRIPT, 'list', target])
  if (result.exitCode !== 0) {
    mapHelperExit(result.exitCode, result.stderr.toString('utf8'), 'Could not list files')
  }

  const mapped: VolumeFileEntry[] = []
  for (const line of result.stdout.toString('utf8').split('\n')) {
    if (!line.trim()) {
      continue
    }
    const [type, size, mtime, encoded] = line.split('\t')
    if (!type || !encoded) {
      continue
    }
    const name = Buffer.from(encoded, 'base64').toString('utf8')
    const isDirectory = type === 'directory'
    mapped.push({
      name,
      path: joinVolumePath(relative, name),
      type: isDirectory ? 'directory' : 'file',
      size: isDirectory ? 0 : Number(size || 0),
      modifiedAt: Number(mtime || 0),
      binary: !isDirectory && isProbablyBinaryName(name)
    })
  }

  mapped.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

  return {
    volume,
    path: toPosixPath(relative),
    parent: parentVolumePath(relative),
    entries: mapped,
    via: 'helper'
  }
}

export async function listVolumeFiles(volume: string, relative = ''): Promise<VolumeFileListResponse> {
  joinVolumePath(relative)
  const direct = await resolveDirectAccess(volume)
  if (direct) {
    return listViaFs(volume, relative, direct.root, direct.via)
  }
  return listViaHelper(volume, relative)
}

async function readViaFs(
  volume: string,
  relative: string,
  root: string,
  via: 'host' | 'bind'
): Promise<VolumeFileReadResponse> {
  const filePath = resolveUnderRoot(root, relative)
  let info
  try {
    info = await stat(filePath)
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: 'File not found in volume' })
    }
    throw error
  }
  if (info.isDirectory()) {
    throw createError({ statusCode: 400, statusMessage: 'Path is a directory' })
  }

  const buffer = await readFile(filePath)
  const binary = isProbablyBinaryName(relative) || isBinaryBuffer(buffer)
  const tooLarge = buffer.length > MAX_EDIT_BYTES
  const name = fileNameFromPath(relative)

  return {
    volume,
    path: toPosixPath(relative),
    name,
    size: info.size,
    modifiedAt: Math.floor(info.mtimeMs / 1000),
    binary,
    tooLarge,
    language: languageFromPath(name),
    content: binary || tooLarge ? null : buffer.toString('utf8'),
    via
  }
}

async function readViaHelper(volume: string, relative: string): Promise<VolumeFileReadResponse> {
  const container = await withDockerError(() => getHelperContainer(volume), 'Could not attach to volume')
  const target = containerDataPath(relative)
  const statResult = await execCommand(container, ['stat', '-c', '%F|%s|%Y', target])
  if (statResult.exitCode !== 0) {
    mapHelperExit(statResult.exitCode, statResult.stderr.toString('utf8'), 'File not found in volume')
  }
  const [kind, sizeRaw, mtimeRaw] = statResult.stdout.toString('utf8').trim().split('|')
  if (kind?.includes('directory')) {
    throw createError({ statusCode: 400, statusMessage: 'Path is a directory' })
  }

  const cat = await execCommand(container, ['cat', target])
  if (cat.exitCode !== 0) {
    mapHelperExit(cat.exitCode, cat.stderr.toString('utf8'), 'Could not read file')
  }

  const buffer = cat.stdout
  const binary = isProbablyBinaryName(relative) || isBinaryBuffer(buffer)
  const tooLarge = buffer.length > MAX_EDIT_BYTES
  const name = fileNameFromPath(relative)

  return {
    volume,
    path: toPosixPath(relative),
    name,
    size: Number(sizeRaw || buffer.length),
    modifiedAt: Number(mtimeRaw || 0),
    binary,
    tooLarge,
    language: languageFromPath(name),
    content: binary || tooLarge ? null : buffer.toString('utf8'),
    via: 'helper'
  }
}

export async function readVolumeFile(volume: string, relative: string): Promise<VolumeFileReadResponse> {
  if (!toPosixPath(relative)) {
    throw createError({ statusCode: 400, statusMessage: 'File path is required' })
  }
  const direct = await resolveDirectAccess(volume)
  if (direct) {
    return readViaFs(volume, relative, direct.root, direct.via)
  }
  return readViaHelper(volume, relative)
}

export async function readVolumeFileBuffer(volume: string, relative: string): Promise<{ buffer: Buffer, name: string }> {
  const posix = toPosixPath(relative)
  if (!posix) {
    throw createError({ statusCode: 400, statusMessage: 'File path is required' })
  }

  const direct = await resolveDirectAccess(volume)
  if (direct) {
    const filePath = resolveUnderRoot(direct.root, relative)
    const info = await stat(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        throw createError({ statusCode: 404, statusMessage: 'File not found in volume' })
      }
      throw error
    })
    if (info.isDirectory()) {
      throw createError({ statusCode: 400, statusMessage: 'Path is a directory' })
    }
    return { buffer: await readFile(filePath), name: fileNameFromPath(relative) }
  }

  const container = await withDockerError(() => getHelperContainer(volume), 'Could not attach to volume')
  const cat = await execCommand(container, ['cat', containerDataPath(relative)])
  if (cat.exitCode !== 0) {
    mapHelperExit(cat.exitCode, cat.stderr.toString('utf8'), 'Could not read file')
  }
  return { buffer: cat.stdout, name: fileNameFromPath(relative) }
}

async function writeViaFs(root: string, relative: string, content: string, expectedMtime?: number): Promise<VolumeFileWriteResponse> {
  const filePath = resolveUnderRoot(root, relative)
  try {
    const info = await stat(filePath)
    if (info.isDirectory()) {
      throw createError({ statusCode: 400, statusMessage: 'Path is a directory' })
    }
    if (expectedMtime && Math.floor(info.mtimeMs / 1000) !== expectedMtime) {
      throw createError({ statusCode: 409, statusMessage: 'File changed on disk since you opened it' })
    }
  }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await mkdir(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.dvm-tmp-${process.pid}`
  try {
    await writeFile(tmp, content, 'utf8')
    await rename(tmp, filePath)
  }
  catch (error) {
    await unlink(tmp).catch(() => undefined)
    throw error
  }

  const info = await stat(filePath)
  return {
    path: toPosixPath(relative),
    size: info.size,
    modifiedAt: Math.floor(info.mtimeMs / 1000)
  }
}

async function writeViaHelper(volume: string, relative: string, content: string, expectedMtime?: number): Promise<VolumeFileWriteResponse> {
  const container = await withDockerError(() => getHelperContainer(volume), 'Could not attach to volume')
  const target = containerDataPath(relative)
  const parent = target.split('/').slice(0, -1).join('/') || '/data'

  if (expectedMtime) {
    const current = await execCommand(container, ['stat', '-c', '%Y', target])
    if (current.exitCode === 0) {
      const mtime = Number(current.stdout.toString('utf8').trim())
      if (mtime !== expectedMtime) {
        throw createError({ statusCode: 409, statusMessage: 'File changed on disk since you opened it' })
      }
    }
  }

  const mkdirResult = await execCommand(container, ['mkdir', '-p', parent])
  if (mkdirResult.exitCode !== 0) {
    throw createError({ statusCode: 500, statusMessage: 'Could not create parent directory' })
  }

  const written = await execCommand(container, ['tee', target], { stdin: Buffer.from(content, 'utf8') })
  if (written.exitCode !== 0) {
    mapHelperExit(written.exitCode, written.stderr.toString('utf8'), 'Could not save file')
  }

  const info = await execCommand(container, ['stat', '-c', '%s %Y', target])
  const [sizeRaw, mtimeRaw] = info.stdout.toString('utf8').trim().split(' ')
  return {
    path: toPosixPath(relative),
    size: Number(sizeRaw || Buffer.byteLength(content, 'utf8')),
    modifiedAt: Number(mtimeRaw || Math.floor(Date.now() / 1000))
  }
}

export async function writeVolumeFile(
  volume: string,
  relative: string,
  content: string,
  expectedMtime?: number
): Promise<VolumeFileWriteResponse> {
  if (!toPosixPath(relative)) {
    throw createError({ statusCode: 400, statusMessage: 'File path is required' })
  }
  const direct = await resolveDirectAccess(volume)
  if (direct) {
    return writeViaFs(direct.root, relative, content, expectedMtime)
  }
  return writeViaHelper(volume, relative, content, expectedMtime)
}
