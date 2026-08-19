import { removeVolume } from '../../utils/volume-ops'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Volume name is required' })
  }
  const query = getQuery(event)
  const force = query.force === 'true' || query.force === '1'
  await removeVolume(decodeURIComponent(name), force)
  return { ok: true }
})
