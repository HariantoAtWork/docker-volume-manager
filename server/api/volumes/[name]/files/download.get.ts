import { readVolumeFileBuffer } from '../../../../utils/volume-fs'
import { inspectVolume } from '../../../../utils/volume-ops'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Volume name is required' })
  }
  const volume = decodeURIComponent(name)
  await inspectVolume(volume)
  const query = getQuery(event)
  const path = typeof query.path === 'string' ? query.path : ''
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'File path is required' })
  }

  const { buffer, name: fileName } = await readVolumeFileBuffer(volume, path)
  const encoded = encodeURIComponent(fileName)
  setHeader(event, 'Content-Type', 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `attachment; filename="${fileName.replace(/"/g, '')}"; filename*=UTF-8''${encoded}`)
  setHeader(event, 'Content-Length', buffer.length)
  return buffer
})
