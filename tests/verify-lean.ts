import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { examples, lessons } from '../lib/content';
import { finishRun, sourceForRun } from '../lib/lean';
import { fixtureRoot, prepareRuntime } from '../scripts/prepare-runtime';
import { bootLean } from './wasm-driver';

await prepareRuntime();
console.log('Booting the actual Lean WASM compiler…');
const compile = await bootLean(fixtureRoot);
let count = 0;
const run = (code: string) => { const result = compile(code); return finishRun(result.success, result.elapsed, result.lines); };
for (const example of examples) {
  const result = run(sourceForRun(example.code, example.mode));
  assert.ok(result.success && !result.incomplete, `${example.id}: ${JSON.stringify(result)}`);
  const actual = result.output.map(line => line.text).join('\n').trim();
  assert.equal(actual || 'File checked successfully.', example.expected, `${example.id} output`);
  console.log(`PASS example: ${example.title} (${Math.round(result.elapsed)} ms)`); count++;
}
for (const lesson of lessons) {
  const mode = ['io', 'verified'].includes(lesson.id) ? 'program' : 'check';
  const solution = run(sourceForRun(lesson.solution, mode, lesson.validation));
  assert.ok(solution.success && !solution.incomplete, `${lesson.id} solution: ${JSON.stringify(solution)}`);
  const starter = run(sourceForRun(lesson.starter, mode, lesson.validation));
  assert.ok(!starter.success || starter.incomplete, `${lesson.id}: unfinished starter must not pass: ${JSON.stringify(starter)}`);
  console.log(`PASS lesson solution + rejected starter: ${lesson.title}`); count += 2;
}
assert.equal(run('example : 2 + 2 = 5 := by rfl').success, false); count++;
assert.equal(run('def broken : Nat := "oops"').success, false); count++;
assert.equal(run('example : False := by sorry').incomplete, true); count++;

// Verify the native execution path taught in the app when Lean is installed.
if (spawnSync('lean', ['--version']).status === 0) {
  const dir = await mkdtemp(path.join(tmpdir(), 'lean-lab-native-'));
  try {
    for (const example of examples.filter(example => example.mode === 'program')) {
      const file = path.join(dir, example.file); await writeFile(file, example.code);
      const result = spawnSync('lean', ['--run', file], { encoding: 'utf8', timeout: 30_000 });
      assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout.trim(), example.expected, `${example.id} native output`); count++;
    }
    console.log('PASS native lean --run for every program');
    const lake = spawnSync('lake', ['init', 'hello', 'exe'], { cwd: dir, encoding: 'utf8', timeout: 30_000 });
    assert.equal(lake.status, 0, lake.stderr);
    await writeFile(path.join(dir, 'Main.lean'), examples[0].code);
    const build = spawnSync('lake', ['build'], { cwd: dir, encoding: 'utf8', timeout: 60_000 });
    assert.equal(build.status, 0, build.stderr);
    const executable = spawnSync(path.join(dir, '.lake/build/bin/hello'), [], { encoding: 'utf8', timeout: 10_000 });
    assert.equal(executable.stdout.trim(), examples[0].expected); count++;
    console.log('PASS Lake build + native executable');
  } finally { await rm(dir, { recursive: true, force: true }); }
}
console.log(`\n${count} real-runtime checks passed.`);
// The Emscripten pthread pool intentionally stays alive for repeated compiles.
process.exit(0);
