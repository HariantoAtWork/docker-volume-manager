<script setup lang="ts">
import type * as Monaco from 'monaco-editor'

const { language, readOnly = false } = defineProps<{
  language: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const model = defineModel<string>({ required: true })
const el = useTemplateRef<HTMLDivElement>('editor')

let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monacoApi: typeof Monaco | null = null
let applyingExternal = false
let workerBlob: string | null = null

function workerUrl(): string {
  if (workerBlob) {
    return workerBlob
  }
  const base = `${window.location.origin}/monaco/`
  const source = `self.MonacoEnvironment = { baseUrl: ${JSON.stringify(base)} }; importScripts(${JSON.stringify(`${base}vs/base/worker/workerMain.js`)});`
  workerBlob = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  return workerBlob
}

onMounted(async () => {
  self.MonacoEnvironment = {
    getWorkerUrl: () => workerUrl()
  }

  const monaco = await import('monaco-editor')
  monacoApi = monaco

  monaco.editor.defineTheme('harbour', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#121820',
      'editor.foreground': '#d4c4a8',
      'editorLineNumber.foreground': '#6a7a88',
      'editorCursor.foreground': '#e2a15a',
      'editor.selectionBackground': '#e2a15a33',
      'editor.lineHighlightBackground': '#1c2733'
    }
  })

  if (!el.value) {
    return
  }

  editor = monaco.editor.create(el.value, {
    value: model.value,
    language,
    theme: 'harbour',
    automaticLayout: true,
    minimap: { enabled: false },
    fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
    fontSize: 13,
    lineHeight: 20,
    readOnly,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: 'line',
    smoothScrolling: true
  })

  editor.onDidChangeModelContent(() => {
    if (applyingExternal) {
      return
    }
    const next = editor?.getValue()
    if (next !== undefined) {
      model.value = next
    }
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    emit('save')
  })
})

watch(() => model.value, (value) => {
  if (editor && editor.getValue() !== value) {
    applyingExternal = true
    editor.setValue(value)
    applyingExternal = false
  }
})

watch(() => language, (lang) => {
  const current = editor?.getModel()
  if (current && monacoApi) {
    monacoApi.editor.setModelLanguage(current, lang)
  }
})

watch(() => readOnly, (value) => {
  editor?.updateOptions({ readOnly: value })
})

onBeforeUnmount(() => {
  editor?.dispose()
  editor = null
  if (workerBlob) {
    URL.revokeObjectURL(workerBlob)
    workerBlob = null
  }
})
</script>

<template>
  <div
    ref="editor"
    class="h-full min-h-[28rem] overflow-hidden rounded-lg border border-default"
    role="textbox"
    aria-label="File editor"
    aria-multiline="true"
  />
</template>
