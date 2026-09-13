import type { Diagnostic } from './lean';

export interface EditorHandle { focusAt(line: number, column: number): void }
export interface LeanEditorProps {
  id: string;
  value: string;
  onChange(value: string): void;
  theme: 'light' | 'dark';
  diagnostics: Diagnostic[];
  onCursor(line: number, column: number): void;
  onReady(editor: EditorHandle, enhanced: boolean): void;
}

export function replaceSelection(value: string, start: number, end: number, text: string) {
  return { value: value.slice(0, start) + text + value.slice(end), cursor: start + text.length };
}

export function cursorPosition(value: string, offset: number) {
  const before = value.slice(0, offset);
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}

export function cursorOffset(value: string, line: number, column: number) {
  const lines = value.split('\n');
  const index = Math.max(0, Math.min(lines.length - 1, line - 1));
  return lines.slice(0, index).reduce((offset, text) => offset + text.length + 1, 0)
    + Math.max(0, Math.min(lines[index].length, column - 1));
}
