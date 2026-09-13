import type { ExecutionMode } from './content';

export interface Diagnostic { severity: 'error' | 'warning' | 'information'; message: string; line: number; column: number; endLine: number; endColumn: number }
export interface OutputLine { stream: 'stdout' | 'stderr'; text: string }
export interface RunResult { success: boolean; elapsed: number; diagnostics: Diagnostic[]; output: OutputLine[]; incomplete: boolean }

export function parseLeanLine(text: string, stream: 'stdout' | 'stderr'): { diagnostic?: Diagnostic; output?: OutputLine } {
  try {
    const data = JSON.parse(text);
    if (typeof data.severity === 'string' && typeof data.data === 'string') {
      if (data.severity === 'information') return { output: { stream: 'stdout', text: data.data } };
      return { diagnostic: {
        severity: data.severity === 'error' ? 'error' : 'warning', message: data.data,
        line: data.pos?.line ?? 1, column: (data.pos?.column ?? 0) + 1,
        endLine: data.endPos?.line ?? data.pos?.line ?? 1,
        endColumn: (data.endPos?.column ?? data.pos?.column ?? 0) + 1,
      } };
    }
  } catch { /* Normal IO output is plain text. */ }
  return text ? { output: { stream, text } } : {};
}
export function sourceForRun(source: string, mode: ExecutionMode, validation = ''): string {
  return `${source}\n${validation ? `\n-- Lean Lab exercise checks\n${validation}\n` : ''}${mode === 'program' ? '\n#eval main\n' : ''}`;
}
export function finishRun(success: boolean, elapsed: number, lines: OutputLine[]): RunResult {
  const diagnostics: Diagnostic[] = [], output: OutputLine[] = [];
  for (const line of lines) {
    const parsed = parseLeanLine(line.text, line.stream);
    if (parsed.diagnostic) diagnostics.push(parsed.diagnostic);
    if (parsed.output) output.push(parsed.output);
  }
  return {
    success: success && !diagnostics.some(d => d.severity === 'error'), elapsed, diagnostics, output,
    incomplete: diagnostics.some(d => /declaration uses.*sorry|sorryAx/.test(d.message)),
  };
}

export function encodeSnippet(code: string): string {
  const bytes = new TextEncoder().encode(code);
  if (bytes.length > 24_000) throw new Error('This file is too large for a share link. Use Download instead.');
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
}
export function decodeSnippet(encoded: string): string {
  if (encoded.length > 32_000) throw new Error('This share link is too large.');
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0)));
}
