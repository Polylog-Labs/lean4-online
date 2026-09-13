'use client';
import { useEffect, useRef } from 'react';
import Editor, { loader, type Monaco } from '@monaco-editor/react';
import type { editor, Position } from 'monaco-editor';
import type { Diagnostic } from '../lib/lean';

loader.config({ paths: { vs: '/editor/vs' } });
let configured = false;
function configure(monaco: Monaco) {
  if (configured) return;
  configured = true;
  monaco.languages.register({ id: 'lean4', extensions: ['.lean'] });
  monaco.languages.setLanguageConfiguration('lean4', {
    comments: { lineComment: '--', blockComment: ['/-', '-/'] },
    brackets: [['(', ')'], ['[', ']'], ['{', '}']],
    autoClosingPairs: [{ open: '(', close: ')' }, { open: '[', close: ']' }, { open: '{', close: '}' }, { open: '"', close: '"' }],
  });
  monaco.languages.setMonarchTokensProvider('lean4', {
    keywords: ['def', 'theorem', 'example', 'by', 'where', 'inductive', 'structure', 'deriving', 'match', 'with', 'fun', 'let', 'in', 'do', 'if', 'then', 'else', 'for', 'return', 'import', 'open', 'namespace', 'end', 'class', 'instance', 'variable', 'universe', 'partial', 'private', 'protected', 'noncomputable', 'opaque', 'axiom', 'abbrev'],
    tactics: ['rfl', 'simp', 'rw', 'exact', 'intro', 'intros', 'apply', 'constructor', 'cases', 'induction', 'decide', 'omega', 'sorry', 'have', 'show', 'calc'],
    typeKeywords: ['Nat', 'Int', 'String', 'Bool', 'List', 'Array', 'Option', 'IO', 'Unit', 'Prop', 'Type', 'Repr'],
    tokenizer: {
      root: [[/--.*$/, 'comment'], [/\/-/, 'comment', '@comment'], [/(#eval|#check|#print|#reduce)\b/, 'keyword'], [/s!"/, 'string', '@string'], [/"/, 'string', '@string'], [/[a-zA-Z_][\w'?!]*/, { cases: { '@keywords': 'keyword', '@tactics': 'keyword.tactic', '@typeKeywords': 'type', '@default': 'identifier' } }], [/\d+/, 'number'], [/[{}()[\]]/, '@brackets'], [/:=|=>|→|←|∀|∧|∨|[+*=<>:|·]/, 'operator']],
      comment: [[/\/-/, 'comment', '@push'], [/-\//, 'comment', '@pop'], [/[^/-]+/, 'comment'], [/./, 'comment']],
      string: [[/\\./, 'string.escape'], [/[^"\\]+/, 'string'], [/"/, 'string', '@pop']],
    },
  });
  monaco.editor.defineTheme('lean-light', {
    base: 'vs', inherit: true,
    rules: [{ token: 'comment', foreground: '91909B' }, { token: 'keyword', foreground: '8053BF' }, { token: 'keyword.tactic', foreground: 'B87730' }, { token: 'type', foreground: '167C94' }, { token: 'string', foreground: '398668' }, { token: 'number', foreground: 'C1723A' }, { token: 'operator', foreground: '8A6AB1' }],
    colors: { 'editor.background': '#FEFDFC', 'editor.foreground': '#383641', 'editorLineNumber.foreground': '#BCBAC3', 'editorLineNumber.activeForeground': '#777181', 'editor.lineHighlightBackground': '#F5F3F8', 'editor.selectionBackground': '#E4DBF7', 'editorCursor.foreground': '#8053BF', 'editorIndentGuide.background1': '#F0EDF3', 'editorWidget.background': '#FEFDFC' },
  });
  monaco.editor.defineTheme('lean-dark', {
    base: 'vs-dark', inherit: true,
    rules: [{ token: 'comment', foreground: '777484' }, { token: 'keyword', foreground: 'B999EF' }, { token: 'keyword.tactic', foreground: 'E5B97B' }, { token: 'type', foreground: '86C8D2' }, { token: 'string', foreground: '9BC8A6' }, { token: 'number', foreground: 'DEA97F' }],
    colors: { 'editor.background': '#1B1A20', 'editor.foreground': '#DDD9E5', 'editorLineNumber.foreground': '#57535F', 'editorLineNumber.activeForeground': '#A6A0B2', 'editor.lineHighlightBackground': '#222028', 'editor.selectionBackground': '#443559', 'editorCursor.foreground': '#B999EF', 'editorIndentGuide.background1': '#2B2832', 'editorWidget.background': '#25222C' },
  });
  const symbols: Record<string, string> = { '\\to': '→', '\\leftarrow': '←', '\\forall': '∀', '\\exists': '∃', '\\and': '∧', '\\or': '∨', '\\not': '¬', '\\ne': '≠', '\\le': '≤', '\\ge': '≥', '\\alpha': 'α', '\\beta': 'β', '\\lambda': 'λ' };
  monaco.languages.registerCompletionItemProvider('lean4', {
    triggerCharacters: ['\\'],
    provideCompletionItems(model: editor.ITextModel, position: Position) {
      const prefix = model.getLineContent(position.lineNumber).slice(0, position.column - 1).match(/\\[a-z]*$/)?.[0];
      if (!prefix) return { suggestions: [] };
      return { suggestions: Object.entries(symbols).filter(([key]) => key.startsWith(prefix)).map(([label, insertText]) => ({ label, insertText, detail: insertText, kind: monaco.languages.CompletionItemKind.Text, range: { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: position.column - prefix.length, endColumn: position.column } })) };
    },
  });
}
export function LeanEditor({ id, value, onChange, theme, diagnostics, onCursor, onReady }: {
  id: string; value: string; onChange(value: string): void; theme: 'light' | 'dark'; diagnostics: Diagnostic[];
  onCursor(line: number, column: number): void; onReady(editor: editor.IStandaloneCodeEditor): void;
}) {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  function updateMarkers() {
    const model = editorRef.current?.getModel();
    if (!model || !monacoRef.current) return;
    monacoRef.current.editor.setModelMarkers(model, 'lean4', diagnostics.filter(d => d.line <= model.getLineCount()).map(d => ({
      severity: d.severity === 'error' ? 8 : 4, message: d.message, startLineNumber: d.line, startColumn: d.column,
      endLineNumber: d.endLine, endColumn: Math.max(d.endColumn, d.column + 1),
    })));
  }
  // Monaco's validation is supplied by the actual Lean run, not JavaScript.
  useEffect(updateMarkers, [diagnostics, id]);
  return <Editor height="100%" language="lean4" path={`file:///${id}.lean`} value={value} theme={`lean-${theme}`}
    beforeMount={configure} onChange={next => onChange(next ?? '')}
    onMount={(instance, monaco) => { editorRef.current = instance; monacoRef.current = monaco; onReady(instance); instance.onDidChangeCursorPosition(event => onCursor(event.position.lineNumber, event.position.column)); updateMarkers(); }}
    loading={<div className="editor-loading">Opening your editor<span className="loading-dots">…</span></div>}
    options={{ fontSize: 14, lineHeight: 26, fontFamily: "'Geist Mono', 'SFMono-Regular', Consolas, monospace", fontLigatures: true, minimap: { enabled: false }, padding: { top: 27, bottom: 24 }, scrollBeyondLastLine: false, renderLineHighlight: 'line', overviewRulerLanes: 0, hideCursorInOverviewRuler: true, lineNumbersMinChars: 4, glyphMargin: false, folding: true, automaticLayout: true, tabSize: 2, wordWrap: 'on', smoothScrolling: true, bracketPairColorization: { enabled: false }, guides: { indentation: true }, scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 }, ariaLabel: 'Lean source code editor', quickSuggestions: false, suggestOnTriggerCharacters: true }} />;
}
