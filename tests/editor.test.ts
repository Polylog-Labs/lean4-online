import assert from 'node:assert/strict';
import test from 'node:test';
import { cursorOffset, cursorPosition, replaceSelection } from '../lib/editor';

test('symbol insertion replaces the selected text and preserves surrounding Lean code', () => {
  const source = 'example : P \\to P := by\n  intro h';
  const start = source.indexOf('\\to');
  const inserted = replaceSelection(source, start, start + 3, '→');
  assert.equal(inserted.value, 'example : P → P := by\n  intro h');
  assert.deepEqual(cursorPosition(inserted.value, inserted.cursor), { line: 1, column: 14 });
  const lastLine = inserted.value.indexOf('  intro');
  const replaced = replaceSelection(inserted.value, lastLine, inserted.value.length, '  exact id');
  assert.equal(replaced.value, 'example : P → P := by\n  exact id');
  assert.deepEqual(cursorPosition(replaced.value, replaced.cursor), { line: 2, column: 11 });
});

test('diagnostic navigation handles multiline code and positions beyond the current file', () => {
  const code = 'example : P → P := by\n  intro h\n  exact h';
  assert.equal(code.slice(cursorOffset(code, 3, 3)), 'exact h');
  assert.equal(cursorOffset(code, 90, 200), code.length);
  assert.equal(cursorOffset(code, 0, 0), 0);
});
