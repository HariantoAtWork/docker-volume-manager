import { createError } from 'h3'

interface DockerLikeError {
  statusCode?: number
  status?: number
  reason?: string
  message?: string
  json?: { message?: string }
}

export function throwDockerError(error: unknown, fallback = 'Docker request failed'): never {
  const err = error as DockerLikeError
  const statusCode = err.statusCode || err.status || 500
  const message = err.json?.message || err.reason || err.message || fallback

  throw createError({
    statusCode,
    statusMessage: message,
    message
  })
}

export async function withDockerError<T>(work: () => Promise<T>, fallback?: string): Promise<T> {
  try {
    return await work()
  }
  catch (error) {
    throwDockerError(error, fallback)
  }
}
