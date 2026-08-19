import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

interface HarbourPalette {
  bg: string
  dusk: string
  fg: string
  muted: string
  sodium: string
  seaglass: string
  flare: string
  gutter: string
  selection: string
}

const dark: HarbourPalette = {
  bg: '#121820',
  dusk: '#1c2733',
  fg: '#d4c4a8',
  muted: '#6a7a88',
  sodium: '#e2a15a',
  seaglass: '#6a9b96',
  flare: '#c45c4a',
  gutter: '#0e141a',
  selection: '#e2a15a33'
}

const light: HarbourPalette = {
  bg: '#e7edf2',
  dusk: '#d5dee6',
  fg: '#3d4a54',
  muted: '#6a7a88',
  sodium: '#b8751f',
  seaglass: '#3d6f6a',
  flare: '#a34538',
  gutter: '#dce4ea',
  selection: '#b8751f33'
}

export function harbourTheme(isDark: boolean): Extension {
  const colors = isDark ? dark : light

  const highlight = HighlightStyle.define([
    { tag: t.comment, color: colors.seaglass, fontStyle: 'italic' },
    { tag: t.lineComment, color: colors.seaglass, fontStyle: 'italic' },
    { tag: t.blockComment, color: colors.seaglass, fontStyle: 'italic' },
    { tag: t.keyword, color: colors.sodium },
    { tag: t.controlKeyword, color: colors.sodium },
    { tag: t.definitionKeyword, color: colors.sodium },
    { tag: t.moduleKeyword, color: colors.sodium },
    { tag: t.string, color: colors.seaglass },
    { tag: t.number, color: colors.flare },
    { tag: t.bool, color: colors.flare },
    { tag: t.null, color: colors.flare },
    { tag: t.atom, color: colors.flare },
    { tag: t.propertyName, color: colors.fg },
    { tag: t.variableName, color: colors.fg },
    { tag: t.function(t.variableName), color: colors.sodium },
    { tag: t.typeName, color: colors.seaglass },
    { tag: t.className, color: colors.seaglass },
    { tag: t.operator, color: colors.muted },
    { tag: t.punctuation, color: colors.muted },
    { tag: t.bracket, color: colors.muted },
    { tag: t.tagName, color: colors.sodium },
    { tag: t.attributeName, color: colors.seaglass },
    { tag: t.heading, color: colors.sodium, fontWeight: '700' },
    { tag: t.link, color: colors.seaglass },
    { tag: t.url, color: colors.seaglass },
    { tag: t.meta, color: colors.muted },
    { tag: t.invalid, color: colors.flare }
  ])

  const theme = EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: colors.bg,
      color: colors.fg,
      fontSize: '13px'
    },
    '&.cm-editor': {
      height: '100%'
    },
    '&.cm-focused': {
      outline: 'none'
    },
    '.cm-scroller': {
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      lineHeight: '20px',
      overflow: 'auto'
    },
    '.cm-content': {
      padding: '16px 0',
      caretColor: colors.sodium
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: colors.sodium
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: colors.selection
    },
    '.cm-activeLine': {
      backgroundColor: colors.dusk
    },
    '.cm-activeLineGutter': {
      backgroundColor: colors.dusk
    },
    '.cm-gutters': {
      backgroundColor: colors.gutter,
      color: colors.muted,
      border: 'none'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '2.5rem'
    }
  }, { dark: isDark })

  return [theme, syntaxHighlighting(highlight)]
}
