const VOLUME_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/

export function isValidVolumeName(name: string): boolean {
  return VOLUME_NAME_RE.test(name) && name.length <= 255
}

export function joinVolumePath(...parts: string[]): string {
  const tokens = parts
    .flatMap(part => part.replaceAll('\\', '/').split('/'))
    .filter(token => token.length > 0 && token !== '.')

  if (tokens.some(token => token === '..')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Path must stay inside the volume'
    })
  }

  return tokens.join('/')
}

export function parentVolumePath(relative: string): string | null {
  const normalised = joinVolumePath(relative)
  if (!normalised) {
    return null
  }
  const parts = normalised.split('/')
  parts.pop()
  return parts.join('/')
}

export function fileNameFromPath(relative: string): string {
  const normalised = joinVolumePath(relative)
  if (!normalised) {
    return ''
  }
  return normalised.split('/').at(-1) ?? normalised
}

export function toPosixPath(relative: string): string {
  return joinVolumePath(relative)
}
