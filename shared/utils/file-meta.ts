const BINARY_EXTENSIONS = new Set([
  '7z', 'aac', 'avi', 'bin', 'bmp', 'class', 'db', 'dll', 'dmg', 'doc', 'docx',
  'eot', 'exe', 'flac', 'flv', 'gif', 'gz', 'ico', 'iso', 'jar', 'jpeg', 'jpg',
  'm4a', 'mkv', 'mov', 'mp3', 'mp4', 'ogg', 'otf', 'pdf', 'png', 'ppt', 'pptx',
  'psd', 'rar', 'so', 'sqlite', 'svgz', 'tar', 'tgz', 'ttf', 'wasm', 'wav',
  'webm', 'webp', 'woff', 'woff2', 'xls', 'xlsx', 'zip', 'zst'
])

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  bash: 'shell',
  c: 'c',
  cc: 'cpp',
  cmake: 'plaintext',
  coffee: 'coffee',
  conf: 'ini',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  csv: 'plaintext',
  dart: 'dart',
  dockerfile: 'dockerfile',
  env: 'ini',
  ex: 'plaintext',
  exs: 'plaintext',
  go: 'go',
  graphql: 'graphql',
  h: 'c',
  hpp: 'cpp',
  htm: 'html',
  html: 'html',
  ini: 'ini',
  java: 'java',
  js: 'javascript',
  json: 'json',
  json5: 'json',
  jsonc: 'json',
  jsx: 'javascript',
  kt: 'kotlin',
  less: 'less',
  log: 'plaintext',
  lua: 'lua',
  m: 'objective-c',
  md: 'markdown',
  mdx: 'markdown',
  mjs: 'javascript',
  php: 'php',
  pl: 'perl',
  proto: 'protobuf',
  ps1: 'powershell',
  py: 'python',
  r: 'r',
  rb: 'ruby',
  rs: 'rust',
  sass: 'scss',
  scss: 'scss',
  sh: 'shell',
  sql: 'sql',
  svelte: 'html',
  svg: 'xml',
  swift: 'swift',
  tf: 'plaintext',
  toml: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  txt: 'plaintext',
  vue: 'html',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'shell'
}

const LANGUAGE_BY_FILENAME: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'plaintext',
  '.gitignore': 'plaintext',
  '.dockerignore': 'plaintext',
  '.env': 'ini',
  'cmakelists.txt': 'plaintext'
}

export function extensionOf(name: string): string {
  const base = name.split('/').at(-1) ?? name
  if (base.startsWith('.') && !base.slice(1).includes('.')) {
    return base.slice(1).toLowerCase()
  }
  const dot = base.lastIndexOf('.')
  if (dot <= 0) {
    return ''
  }
  return base.slice(dot + 1).toLowerCase()
}

export function languageFromPath(path: string): string {
  const name = (path.split('/').at(-1) ?? path).toLowerCase()
  if (LANGUAGE_BY_FILENAME[name]) {
    return LANGUAGE_BY_FILENAME[name]
  }
  const ext = extensionOf(name)
  return LANGUAGE_BY_EXTENSION[ext] ?? 'plaintext'
}

export function isProbablyBinaryName(path: string): boolean {
  return BINARY_EXTENSIONS.has(extensionOf(path))
}

export function isBinaryBuffer(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 8000)
  if (sample.includes(0)) {
    return true
  }
  let suspicious = 0
  for (const byte of sample) {
    if (byte < 7 || (byte > 14 && byte < 32 && byte !== 27)) {
      suspicious += 1
    }
  }
  return sample.length > 0 && suspicious / sample.length > 0.3
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '—'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 10 || unit === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unit]}`
}
