'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EditorState, EditorSelection, Compartment, Prec, Transaction } from '@codemirror/state';
import { EditorView, lineNumbers, keymap, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting, indentUnit, bracketMatching } from '@codemirror/language';
import { searchKeymap, openSearchPanel } from '@codemirror/search';
import { setDiagnostics } from '@codemirror/lint';
import { tags } from '@lezer/highlight';
import { Search, Undo2, Redo2 } from 'lucide-react';
import { cursorOffset, type LeanEditorProps } from '../lib/editor';
import { leanLanguage } from '../lib/lean-language';
import { unicodeSymbols } from '../lib/unicode';

const colors = HighlightStyle.define([
  { tag: tags.keyword, class: 'lean-keyword' }, { tag: tags.atom, class: 'lean-tactic' },
  { tag: tags.typeName, class: 'lean-type' }, { tag: tags.string, class: 'lean-string' },
  { tag: tags.number, class: 'lean-number' }, { tag: tags.comment, class: 'lean-comment' },
  { tag: tags.operator, class: 'lean-operator' },
]);
function insertSymbol(view: EditorView) {
  const { from, to } = view.state.selection.main;
  if (from !== to || view.composing) return false;
  const abbreviation = view.state.sliceDoc(Math.max(0, from - 32), from).match(/\\[a-zA-Z]+$/)?.[0];
  if (!abbreviation || !unicodeSymbols[abbreviation]) return false;
  const symbol = unicodeSymbols[abbreviation];
  view.dispatch({ changes: { from: from - abbreviation.length, to, insert: symbol }, selection: { anchor: from - abbreviation.length + symbol.length }, userEvent: 'input.type' });
  return true;
}
const themeSlot = new Compartment();
function editorTheme(dark: boolean, fontSize: number) {
  return EditorView.theme({
    '&': { height: '100%', fontSize: `${Math.max(16, fontSize)}px`, color: 'var(--text)', backgroundColor: 'var(--surface)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.55', overscrollBehavior: 'contain' },
    '.cm-content': { padding: '12px 0', caretColor: 'var(--accent)' },
    '.cm-line': { padding: '0 12px 0 8px' },
    '.cm-gutters': { backgroundColor: 'var(--surface)', color: 'var(--soft)', border: 'none', fontSize: '11px', minWidth: '28px' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--accent-soft)' },
    '.cm-panels': { backgroundColor: 'var(--surface-raised)', color: 'var(--text)' },
    '.cm-textfield': { backgroundColor: 'var(--canvas)', color: 'var(--text)', borderColor: 'var(--border)', fontSize: '16px', maxWidth: '150px' },
    '.cm-button': { backgroundImage: 'none', backgroundColor: 'var(--accent-soft)', color: 'var(--text)', borderColor: 'var(--border)' },
    '.cm-search': { fontSize: '12px' },
    '.cm-tooltip': { backgroundColor: 'var(--surface-raised)', color: 'var(--text)', borderColor: 'var(--border)' },
  }, { dark });
}

export function MobileEditor(props: LeanEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latest = useRef(props);
  const documents = useRef(new Map<string, EditorState>());
  const activeId = useRef(props.id);
  const makeState = useRef<((value: string) => EditorState) | null>(null);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  useLayoutEffect(() => { latest.current = props; });
  useEffect(() => {
    const createState = (value: string) => EditorState.create({ doc: value, extensions: [
      leanLanguage, syntaxHighlighting(colors), history(), lineNumbers(), highlightActiveLineGutter(), bracketMatching(),
      indentUnit.of('  '), EditorState.tabSize.of(2), EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Lean source code editor', 'aria-multiline': 'true', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false' }),
      themeSlot.of(editorTheme(latest.current.theme === 'dark', latest.current.fontSize)),
      Prec.high(keymap.of([{ key: 'Tab', run: insertSymbol }, { key: 'Enter', run: insertSymbol }])),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      EditorView.inputHandler.of((view, _from, _to, text) => text === '\n' && insertSymbol(view)),
      EditorView.updateListener.of(update => {
        if (update.docChanged) latest.current.onChange(update.state.doc.toString());
        if (update.selectionSet || update.docChanged) {
          const cursor = update.state.selection.main.head, line = update.state.doc.lineAt(cursor);
          latest.current.onCursor(line.number, cursor - line.from + 1);
        }
      }),
    ] });
    makeState.current = createState;
    const view = new EditorView({ state: createState(latest.current.value), parent: host.current! });
    viewRef.current = view;
    latest.current.onReady({ focusAt(line, column) {
      const cursor = cursorOffset(view.state.doc.toString(), line, column);
      view.dispatch({ selection: { anchor: cursor }, effects: EditorView.scrollIntoView(cursor, { y: 'center' }) });
      view.focus();
    } }, false);
    return () => { view.destroy(); viewRef.current = null; };
  }, []);
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (activeId.current !== props.id) {
      documents.current.set(activeId.current, view.state);
      const saved = documents.current.get(props.id);
      activeId.current = props.id;
      view.setState(saved ?? makeState.current!(props.value));
    }
    if (view.state.doc.toString() !== props.value) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.value }, annotations: Transaction.addToHistory.of(false) });
  }, [props.id, props.value]);
  useEffect(() => { viewRef.current?.dispatch({ effects: themeSlot.reconfigure(editorTheme(props.theme === 'dark', props.fontSize)) }); }, [props.theme, props.fontSize, props.id]);
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(setDiagnostics(view.state, props.diagnostics.map(diagnostic => {
      const from = cursorOffset(props.value, diagnostic.line, diagnostic.column);
      return { from, to: Math.min(props.value.length, Math.max(from + 1, cursorOffset(props.value, diagnostic.endLine, diagnostic.endColumn))), severity: diagnostic.severity === 'information' ? 'info' as const : diagnostic.severity, message: diagnostic.message };
    })));
  }, [props.diagnostics, props.value, props.id]);
  function insert(text: string) {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(view.state.changeByRange(range => ({ changes: { from: range.from, to: range.to, insert: text }, range: EditorSelection.cursor(range.from + text.length) })), { userEvent: 'input.type' });
    view.focus();
  }
  return <div className="mobile-editor">
    <div ref={host} className="mobile-editor-host" />
    <div className="mobile-editor-tools" onPointerDown={event => event.preventDefault()}>
      <button type="button" aria-label="Toggle Lean symbols" aria-expanded={symbolsOpen} className={symbolsOpen ? 'active' : ''} onClick={() => setSymbolsOpen(!symbolsOpen)}>λ <span>Symbols</span></button>
      <button type="button" aria-label="Undo" onClick={() => { if (viewRef.current) undo(viewRef.current); }}><Undo2 size={16} /></button>
      <button type="button" aria-label="Redo" onClick={() => { if (viewRef.current) redo(viewRef.current); }}><Redo2 size={16} /></button>
      <button type="button" aria-label="Find in file" onClick={() => { if (viewRef.current) openSearchPanel(viewRef.current); }}><Search size={16} /></button>
      <button type="button" aria-label="Indent two spaces" onClick={() => insert('  ')}>Tab</button>
    </div>
    {symbolsOpen && <div className="symbol-toolbar" aria-label="Lean symbols" onPointerDown={event => event.preventDefault()}>{['→', '←', '∀', '∃', '∧', '∨', '↔', 'λ', '⟨', '⟩', 'ℕ'].map(symbol => <button type="button" key={symbol} aria-label={`Insert ${symbol}`} onClick={() => insert(symbol)}>{symbol}</button>)}</div>}
  </div>;
}
