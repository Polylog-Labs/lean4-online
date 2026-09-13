import { StreamLanguage, type StreamParser } from '@codemirror/language';
import { leanKeywords, leanTactics, leanTypes } from './lean-tokens';

export const leanParser: StreamParser<{ commentDepth: number; string: boolean }> = {
  startState: () => ({ commentDepth: 0, string: false }),
  token(stream, state) {
    if (state.commentDepth || (!state.string && stream.match('/-'))) {
      if (!state.commentDepth) state.commentDepth = 1;
      while (!stream.eol()) {
        if (stream.match('/-')) state.commentDepth++;
        else if (stream.match('-/')) { if (--state.commentDepth === 0) break; }
        else stream.next();
      }
      return 'comment';
    }
    if (state.string || stream.match(/s!"|"/)) {
      state.string = true;
      while (!stream.eol()) {
        const character = stream.next();
        if (character === '\\') stream.next();
        else if (character === '"') { state.string = false; break; }
      }
      return 'string';
    }
    if (stream.eatSpace()) return null;
    if (stream.match('--')) { stream.skipToEnd(); return 'comment'; }
    if (stream.match(/#[a-zA-Z_]+/)) return 'keyword';
    if (stream.match(/'(?:\\.|[^'\\])'/u)) return 'string';
    if (stream.match(/0[xX][\da-fA-F]+|\d+(?:\.\d+)?/)) return 'number';
    if (stream.match(/«[^»]*»/)) return 'variableName';
    const identifier = stream.match(/[\p{L}_][\p{L}\p{N}_'?!]*/u);
    if (identifier) {
      const word = typeof identifier === 'boolean' ? '' : identifier[0];
      return leanKeywords.has(word) ? 'keyword' : leanTactics.has(word) ? 'atom' : leanTypes.has(word) ? 'typeName' : 'variableName';
    }
    if (stream.match(/[→←∀∃∧∨¬↔≠≤≥∈∉∣×∘▸⊢∑∏∫√⊆∪∩+*=<>:|·-]+/)) return 'operator';
    stream.next(); return null;
  },
  languageData: { commentTokens: { line: '--', block: { open: '/-', close: '-/' } }, indentOnInput: /^\s*(\||else|end)\b/ },
};
export const leanLanguage = StreamLanguage.define(leanParser);
