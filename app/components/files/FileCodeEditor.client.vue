<script setup lang="ts">
import { EditorState, Compartment, Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { basicSetup } from 'codemirror'
import { languageExtension } from '~/utils/codemirror-language'
import { harbourTheme } from '~/utils/codemirror-theme'

const { language, readOnly = false } = defineProps<{
  language: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const model = defineModel<string>({ required: true })
const host = useTemplateRef<HTMLDivElement>('editor')
const colorMode = useColorMode()
const failed = ref(false)

let view: EditorView | null = null
const languageComp = new Compartment()
const themeComp = new Compartment()
const readOnlyComp = new Compartment()
let applyingExternal = false

function isDark() {
  return colorMode.value !== 'light'
}

function mountEditor(el: HTMLDivElement) {
  view?.destroy()
  try {
    view = new EditorView({
      parent: el,
      doc: model.value,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        Prec.highest(keymap.of([{
          key: 'Mod-s',
          preventDefault: true,
          run: () => {
            emit('save')
            return true
          }
        }])),
        languageComp.of(languageExtension(language)),
        themeComp.of(harbourTheme(isDark())),
        readOnlyComp.of(EditorState.readOnly.of(readOnly)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || applyingExternal) {
            return
          }
          model.value = update.state.doc.toString()
        })
      ]
    })
    failed.value = false
  }
  catch {
    view = null
    failed.value = true
  }
}

watch(host, (el) => {
  if (el) {
    mountEditor(el)
  }
}, { flush: 'post', immediate: true })

watch(() => model.value, (value) => {
  if (view && view.state.doc.toString() !== value) {
    applyingExternal = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value }
    })
    applyingExternal = false
  }
})

watch(() => language, (lang) => {
  view?.dispatch({ effects: languageComp.reconfigure(languageExtension(lang)) })
})

watch(() => readOnly, (value) => {
  view?.dispatch({ effects: readOnlyComp.reconfigure(EditorState.readOnly.of(value)) })
})

watch(() => colorMode.value, () => {
  view?.dispatch({ effects: themeComp.reconfigure(harbourTheme(isDark())) })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<template>
  <textarea
    v-if="failed"
    v-model="model"
    class="h-full min-h-[28rem] w-full resize-y border-0 bg-[var(--harbour-ink)] p-4 font-mono text-sm text-[var(--harbour-stamp)] outline-none"
    :readonly="readOnly"
    :aria-label="`${language} file editor`"
    spellcheck="false"
    @keydown.meta.s.prevent="emit('save')"
    @keydown.ctrl.s.prevent="emit('save')"
  />
  <div
    v-else
    ref="editor"
    class="h-full min-h-[28rem] overflow-hidden"
    role="textbox"
    :aria-label="`${language} file editor`"
    aria-multiline="true"
  />
</template>
