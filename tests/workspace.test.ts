import assert from 'node:assert/strict';
import test from 'node:test';
import { availableName, closeTab, fileName, isPersonalFile, restoreWorkspace, type OpenFile } from '../lib/workspace';
import { mathExamples } from '../lib/math-examples';

const own: OpenFile = { id: 'file-existing', title: 'Experiment.lean', code: '-- A draft worth keeping\n#eval 42', mode: 'check' };
const example: OpenFile = { id: 'hello', title: 'Hello.lean', code: 'def main : IO Unit := pure ()', mode: 'program', exampleId: 'hello' };

test('migrates original tabs without losing edited examples or personal drafts', () => {
  const restored = restoreWorkspace({ files: [example, own], activeId: own.id });
  assert.deepEqual(restored, { files: [example, own], openIds: ['hello', own.id], activeId: own.id });
  assert.ok(isPersonalFile(restored!.files[1]));
  assert.equal(isPersonalFile(restored!.files[0]), false);
});
test('closing the last personal tab retains its source through save and restore', () => {
  const closed = closeTab({ files: [own], openIds: [own.id], activeId: own.id }, own.id);
  const restored = restoreWorkspace(JSON.parse(JSON.stringify(closed)));
  assert.deepEqual(restored, { files: [own], openIds: [], activeId: '' });
});
test('restoration tolerates damaged entries without discarding other drafts', () => {
  const restored = restoreWorkspace({ files: [null, {}, own, own, example], openIds: [null, own.id, 'missing', own.id], activeId: 'missing' });
  assert.deepEqual(restored, { files: [own, example], openIds: [own.id], activeId: own.id });
});
test('renaming checks personal name collisions and rejects paths or shell metacharacters', () => {
  assert.equal(fileName(' Algebra ', [own]), 'Algebra.lean');
  assert.equal(fileName('Experiment.lean', [own], own.id), own.title);
  assert.equal(fileName('Hello.lean', [example]), 'Hello.lean');
  assert.throws(() => fileName('experiment', [own]), /already exists/);
  for (const name of ['../Secret', 'folder/File', '$(command)', '`command`', '', '.lean', 'bad name']) assert.throws(() => fileName(name, []));
  assert.equal(availableName('Experiment.lean', [own]), 'Experiment_2.lean');
});
test('the classic collection has 25 distinct list selections with explicit proof scope', () => {
  const classics = mathExamples.filter(example => example.history?.top100);
  assert.equal(classics.length, 25);
  assert.equal(new Set(classics.map(example => example.history!.top100)).size, 25);
  for (const example of mathExamples) {
    assert.ok(example.code.includes('-- History:'));
    assert.ok(example.code.includes('-- Scope:'));
    assert.ok(example.history?.source.startsWith('https://'));
    assert.doesNotMatch(example.code, /\b(sorry|axiom|native_decide)\b/);
  }
});
