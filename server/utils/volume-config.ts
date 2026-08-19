export function envFirst(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]
    if (value && value.length > 0) {
      return value
    }
  }
  return ''
}

export function getVolumeRuntime() {
  const config = useRuntimeConfig()
  const volumeBind = envFirst('VOLUME_BIND', 'NUXT_VOLUME_BIND') || String(config.volumeBind || config.public.volumeBind || '')
  const volumePath = envFirst('VOLUME_PATH', 'NUXT_VOLUME_PATH') || String(config.volumePath || '')
  const helperImage = envFirst('DVM_HELPER_IMAGE', 'NUXT_HELPER_IMAGE') || String(config.helperImage || 'alpine:3.21')
  const dockerSocket = envFirst('DOCKER_SOCKET', 'NUXT_DOCKER_SOCKET') || String(config.dockerSocket || '')
  const dockerHost = envFirst('DOCKER_HOST', 'NUXT_DOCKER_HOST') || String(config.dockerHost || '')

  return {
    volumeBind,
    volumePath,
    helperImage,
    dockerSocket,
    dockerHost
  }
}
