import type { Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { php } from '@codemirror/lang-php'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { c, cpp, csharp, dart, java, kotlin, objectiveC } from '@codemirror/legacy-modes/mode/clike'
import { coffeeScript } from '@codemirror/legacy-modes/mode/coffeescript'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { go } from '@codemirror/legacy-modes/mode/go'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { nginx } from '@codemirror/legacy-modes/mode/nginx'
import { perl } from '@codemirror/legacy-modes/mode/perl'
import { powerShell } from '@codemirror/legacy-modes/mode/powershell'
import { properties } from '@codemirror/legacy-modes/mode/properties'
import { protobuf } from '@codemirror/legacy-modes/mode/protobuf'
import { r } from '@codemirror/legacy-modes/mode/r'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { rust } from '@codemirror/legacy-modes/mode/rust'
import { sass } from '@codemirror/legacy-modes/mode/sass'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { swift } from '@codemirror/legacy-modes/mode/swift'
import { toml } from '@codemirror/legacy-modes/mode/toml'

function stream(mode: Parameters<typeof StreamLanguage.define>[0]): Extension {
  return StreamLanguage.define(mode)
}

const languages: Record<string, () => Extension> = {
  c: () => stream(c),
  coffee: () => stream(coffeeScript),
  cpp: () => stream(cpp),
  csharp: () => stream(csharp),
  css: () => css(),
  dart: () => stream(dart),
  dockerfile: () => stream(dockerFile),
  go: () => stream(go),
  html: () => html(),
  ini: () => stream(properties),
  java: () => stream(java),
  javascript: () => javascript(),
  json: () => json(),
  kotlin: () => stream(kotlin),
  less: () => css(),
  lua: () => stream(lua),
  markdown: () => markdown(),
  nginx: () => stream(nginx),
  'objective-c': () => stream(objectiveC),
  perl: () => stream(perl),
  php: () => php(),
  powershell: () => stream(powerShell),
  protobuf: () => stream(protobuf),
  python: () => python(),
  r: () => stream(r),
  ruby: () => stream(ruby),
  rust: () => stream(rust),
  scss: () => stream(sass),
  shell: () => stream(shell),
  sql: () => sql(),
  swift: () => stream(swift),
  toml: () => stream(toml),
  typescript: () => javascript({ typescript: true }),
  xml: () => xml(),
  yaml: () => yaml()
}

export function languageExtension(language: string): Extension {
  return languages[language]?.() ?? []
}
