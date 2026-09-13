import assert from 'node:assert/strict';
import test from 'node:test';
import { StringStream } from '@codemirror/language';
import { leanParser } from '../lib/lean-language';

function tokenize(source: string) {
  const state = leanParser.startState!(2), tokens: { text: string; type: string | null }[] = [];
  for (const line of source.split('\n')) {
    const stream = new StringStream(line, 2, 2);
    while (!stream.eol()) {
      stream.start = stream.pos;
      const type = leanParser.token(stream, state);
      assert.ok(stream.pos > stream.start, 'Tokenizer always advances');
      tokens.push({ text: stream.current(), type });
    }
  }
  return tokens;
}
test('Lean highlighting distinguishes tactics, types, Unicode operators, and strings', () => {
  const tokens = tokenize('example (P : Prop) : P → P := by\n  intro h\n  exact h\n#eval "a /- string -/"');
  for (const [text, type] of [['example', 'keyword'], ['Prop', 'typeName'], ['→', 'operator'], ['intro', 'atom'], ['exact', 'atom'], ['#eval', 'keyword'], ['"a /- string -/"', 'string']]) {
    assert.ok(tokens.some(token => token.text === text && token.type === type), `${text} is ${type}`);
  }
});
test('nested block comments and multiline strings do not leak highlighting into following code', () => {
  const comments = tokenize('/- outer\n/- inner -/ outer -/ def n : Nat := 2');
  assert.ok(comments.filter(token => token.type === 'comment').every(token => !token.text.includes('def')));
  assert.ok(comments.some(token => token.text === 'def' && token.type === 'keyword'));
  const strings = tokenize('"text\n/- still text"\ndef answer := 42');
  assert.ok(strings.some(token => token.text === '/- still text"' && token.type === 'string'));
  assert.ok(strings.some(token => token.text === 'def' && token.type === 'keyword'));
});
