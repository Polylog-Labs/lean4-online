'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { cursorOffset, cursorPosition, replaceSelection, type LeanEditorProps } from '../lib/editor';
import { unicodeSymbols } from '../lib/unicode';

export function PlainEditor({ value, onChange, onCursor, onReady, notice, toolbar = false }: {
  value: string; onChange(value: string): void; onCursor?(line: number, column: number): void; onReady?: LeanEditorProps['onReady']; notice?: string; toolbar?: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);
  useEffect(() => {
    onReady?.({ focusAt(line, column) {
      const textarea = input.current;
      if (!textarea) return;
      const offset = cursorOffset(textarea.value, line, column);
      textarea.focus(); textarea.setSelectionRange(offset, offset);
      const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight);
      textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - textarea.clientHeight / 2);
    } }, false);
  }, [onReady]);
  useLayoutEffect(() => {
    if (pendingCursor.current === null || !input.current) return;
    input.current.focus();
    input.current.setSelectionRange(pendingCursor.current, pendingCursor.current);
    const position = cursorPosition(value, pendingCursor.current);
    pendingCursor.current = null;
    onCursor?.(position.line, position.column);
  });
  function reportCursor() {
    if (!input.current) return;
    const { line, column } = cursorPosition(input.current.value, input.current.selectionStart);
    onCursor?.(line, column);
  }
  function insert(text: string, start = input.current?.selectionStart ?? value.length, end = input.current?.selectionEnd ?? start) {
    const replacement = replaceSelection(value, start, end, text);
    pendingCursor.current = replacement.cursor;
    onChange(replacement.value);
  }
  return <div className={`plain-editor ${toolbar ? 'with-toolbar' : ''}`}>
    {toolbar && <div className="symbol-toolbar" aria-label="Lean symbols">
      <button type="button" aria-label="Indent two spaces" onPointerDown={event => event.preventDefault()} onClick={() => insert('  ')}>Tab</button>
      {['→', '←', '∀', '∃', '∧', '↔', 'λ', '⟨', '⟩'].map(symbol => <button type="button" key={symbol} aria-label={`Insert ${symbol}`} onPointerDown={event => event.preventDefault()} onClick={() => insert(symbol)}>{symbol}</button>)}
    </div>}
    <textarea ref={input} aria-label="Lean source code editor" value={value}
      onChange={event => { onChange(event.target.value); reportCursor(); }} onSelect={reportCursor}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey) return;
        const start = event.currentTarget.selectionStart, end = event.currentTarget.selectionEnd;
        const abbreviation = value.slice(0, start).match(/\\[a-zA-Z]+$/)?.[0];
        if ((event.key === 'Tab' || event.key === 'Enter') && start === end && abbreviation && unicodeSymbols[abbreviation]) {
          event.preventDefault(); insert(unicodeSymbols[abbreviation], start - abbreviation.length, end);
        } else if (event.key === 'Tab' && !event.shiftKey) { event.preventDefault(); insert('  '); }
        else if (event.key === 'Enter') {
          event.preventDefault();
          const line = value.slice(0, start).split('\n').at(-1) ?? '';
          insert('\n' + (line.match(/^\s*/)?.[0] ?? ''));
        }
      }} spellCheck={false} autoCapitalize="off" autoCorrect="off" />
    {notice && <span>{notice}</span>}
  </div>;
}
