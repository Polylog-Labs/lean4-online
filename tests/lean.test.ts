import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeSnippet, encodeSnippet, finishRun, parseLeanLine, sourceForRun } from '../lib/lean';
import { examples, lessons, syntax } from '../lib/content';

test('Lean diagnostics preserve source positions and cannot report an error as success', () => {
  const line = JSON.stringify({ severity: 'error', data: 'unsolved goals\n⊢ False', pos: { line: 3, column: 2 }, endPos: { line: 3, column: 7 } });
  assert.deepEqual(parseLeanLine(line, 'stdout').diagnostic, { severity: 'error', message: 'unsolved goals\n⊢ False', line: 3, column: 3, endLine: 3, endColumn: 8 });
  assert.equal(finishRun(true, 2, [{ stream: 'stdout', text: line }]).success, false);
});
test('information messages and IO output are displayed, not treated as problems', () => {
  const result = finishRun(true, 1, [{ stream: 'stdout', text: JSON.stringify({ severity: 'information', data: '42' }) }, { stream: 'stdout', text: 'Hello, world!' }]);
  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(result.output.map(line => line.text), ['42', 'Hello, world!']);
});
test('sorry warning prevents a lesson from being counted complete', () => {
  const result = finishRun(true, 1, [{ stream: 'stdout', text: JSON.stringify({ severity: 'warning', data: "declaration uses 'sorry'", pos: { line: 1, column: 0 } }) }]);
  assert.equal(result.success, true); assert.equal(result.incomplete, true);
  assert.equal(finishRun(true, 1, [{ stream: 'stdout', text: JSON.stringify({ severity: 'warning', data: 'declaration uses `sorry`' }) }]).incomplete, true);
});
test('program execution invokes main; file checking leaves main unevaluated', () => {
  assert.equal(sourceForRun('def main : IO Unit := pure ()', 'check'), 'def main : IO Unit := pure ()\n');
  assert.ok(sourceForRun('def main : IO Unit := pure ()', 'program').endsWith('#eval main\n'));
  assert.ok(sourceForRun('def answer := 42', 'check', 'example : answer = 42 := by rfl').includes('example : answer = 42 := by rfl'));
});
test('shared snippets preserve Lean Unicode and reject oversized payloads', () => {
  const code = 'theorem test (P : Prop) : P → P := by\n  intro h\n  exact h\n-- λ ∀ 世界';
  assert.equal(decodeSnippet(encodeSnippet(code)), code);
  assert.throws(() => encodeSnippet('x'.repeat(24_001)));
  assert.throws(() => decodeSnippet('x'.repeat(32_001)));
  assert.throws(() => decodeSnippet('invalid!'));
});
test('all teaching links and identifiers resolve', () => {
  assert.equal(new Set(examples.map(example => example.id)).size, examples.length);
  assert.equal(new Set(lessons.map(lesson => lesson.id)).size, lessons.length);
  assert.equal(new Set(syntax.map(item => item.token)).size, syntax.length);
  for (const example of examples) for (const id of example.related ?? []) assert.ok(examples.some(item => item.id === id), `Missing related example ${id}`);
  assert.deepEqual(examples.filter(example => example.incomplete).map(example => example.id), ['sorry-example']);
  for (const item of [...lessons, ...syntax]) assert.ok(examples.some(example => example.id === item.exampleId));
  for (const lesson of lessons) assert.ok(lesson.validation && lesson.solution && lesson.starter);
});
