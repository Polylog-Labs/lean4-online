import { examples, lessons, syntax } from './content';
import { siteURL } from './site';
import { safariLimitedExamples, safariLimitedLessons } from './browser-compatibility';

export const siteGuide = `# leanlab

> An online Lean 4 editor for learning, executing programs, and checking proofs.

Website: ${siteURL}
Brand: leanlab. Independent learning tool; not the official Lean project.

## Capabilities

- ${examples.length} editable examples, ${lessons.length} guided lessons, and ${syntax.length} syntax entries.
- Examples, Playground (personal files), Learn, and Syntax share one workspace.
- Lean 4.33.0-pre runs as WebAssembly in a browser Web Worker.
- The installed library is Init/core. Mathlib, Std-only modules, arbitrary Lake packages, and cross-file imports are not bundled.
- Check file checks declarations and executes explicit #eval commands. Run program additionally evaluates main : IO Unit using #eval main.
- The guide's expected output is reference text. Only the result of an actual run is evidence that a user's edited file checked successfully.
- sorry admits a statement with a warning. An incomplete proof does not complete a lesson. The Sorry.lean example intentionally demonstrates this warning.
- The full example collection is checked in Chromium. Some examples exceed the pinned compiler’s call-stack limit in WebKit; complete Safari/iPhone runtime compatibility is not established. Affected examples and exercises have Safari notices and an optional Hide Safari limitations filter. Use Run locally if execution fails; unmarked files are not guaranteed to work.
- Desktop uses Monaco. Mobile uses CodeMirror with syntax highlighting, Unicode input, and an output panel docked below the code, and a separate Guide view. Choose Code or close Output to expand the editor. Normal mobile visits open Welcome.lean; explicit shared-program and content links take precedence.
- The first Lean setup downloads about 45.9 MB of compressed compiler/library data. Downloads show progress and are cached. Mobile and desktop Safari start the compiler on Run or Check. Safari releases the worker after a run when its downloads are cached, then initializes a fresh worker from the cache for the next run.
- There is no account or database. Files and lesson progress are saved in local browser storage. Closing a tab keeps a personal file; Delete removes it.

## How to use the site

1. Open an example and edit it, or create a .lean file in Playground.
2. For executable code, define main : IO Unit and choose Run. For proofs or #eval expressions, choose Check.
3. Read Output and Problems. Selecting a diagnostic opens its source location. Fix the source and run it again; an old result does not validate new edits.
4. Open Guide for explanations and related examples. Run locally explains lean --run and Lake builds.
5. Copy an example to Playground to keep an independent file. File actions include rename, download, reset, and share.
6. In Learn, read the lesson, complete the exercise, and run its checks. Hints and solutions are available in the guide.
7. Settings controls appearance, editor/guide text size, layout reset, and lesson-progress reset.

## Links and sharing

Open a catalog example in the editor with /#example=EXAMPLE_ID and a lesson with /#lesson=LESSON_ID.
A shared custom program uses /#code=BASE64_UTF8&mode=program (or mode=check).
The URL fragment contains a snapshot of the program, not a database identifier. Later edits do not change it.
The fragment is not sent in the HTTP request, but anyone who receives the full link can decode it. Do not put secrets in shared code.
Use the Share action to encode Unicode correctly. Download larger files instead of putting them in a link.

## A short Lean introduction

Lean uses : for types, := for definitions, spaces for function application, and indentation for blocks.

\`\`\`lean
def double (n : Nat) : Nat := n + n

theorem four : 2 + 2 = 4 := by
  rfl

example (n : Nat) : double n = n + n := by
  rfl

def main : IO Unit := do
  IO.println (double 21)
\`\`\`

rfl means reflexivity: both sides must reduce to the same expression. simp rewrites with simplification rules; rw [h] rewrites with a named equality. intro introduces a parameter or assumption; exact supplies a term of the required type.
The Curry–Howard correspondence identifies propositions with types and proofs with terms. A proof of P → Q transforms a proof of P into a proof of Q. Proofs in Prop are erased from compiled programs.
Nat contains natural numbers; Int includes negative integers. List α, Option α, and Array α are parameterized data types. Fin n includes a value and a proof that it is less than n.
∀ means for every; ∃ means there exists; ∧ means and; ∨ means or; ↔ means if and only if. Enter symbols with abbreviations such as \\forall or \\to, then Enter or Tab.
An example calculation establishes one result. A theorem quantified over all inputs establishes the stated property for every such input, under its assumptions. A theorem proves its specification, not every desirable property of a program.
Core hash is not cryptographic. The SHA-256 example includes a separate educational implementation with reference-vector tests; those tests are not a formal security proof.

## Readable content

- [All examples](${siteURL}/examples): source code, explanations, expected outputs, and exercises.
- [All lessons](${siteURL}/learn): complete lesson text, starters, hints, and solutions without JavaScript.
- [Full text for agents](${siteURL}/llms-full.txt): the complete example, lesson, and syntax collection.
- [Lean language reference](https://lean-lang.org/doc/reference/latest/)
- [Functional Programming in Lean](https://lean-lang.org/functional_programming_in_lean/)
- [Theorem Proving in Lean](https://lean-lang.org/theorem_proving_in_lean4/)
- [Mathematics in Lean](https://leanprover-community.github.io/mathematics_in_lean/): requires Mathlib, which is not installed in this workspace.
`;

const leanBlock = (code: string) => `\n\`\`\`lean\n${code.trim()}\n\`\`\`\n`;
export function fullSiteGuide() {
  return [siteGuide, '## Examples', ...examples.map(example => [
    `### ${example.title} (${example.id})`, `Category: ${example.category}. Mode: ${example.mode}.`,
    `${siteURL}/examples/${example.id}`, example.description,
    example.incomplete ? 'Intentionally incomplete: the sorry warning is expected.' : '', leanBlock(example.code),
    `Expected output (reference only):\n${example.expected}`,
    safariLimitedExamples.has(example.id) ? 'Safari: this example has a known compiler stack limitation. Read it here or run it locally.' : '',
    ...example.concepts.map(concept => `${concept.token}: ${concept.explanation}`),
    example.history ? `${example.history.milestone}\n${example.history.fact}\nScope: ${example.history.scope}\nSource: ${example.history.source}` : '',
    `Exercise: ${example.challenge}`, ...(example.references ?? []).map(reference => `${reference.title}: ${reference.url}`),
  ].filter(Boolean).join('\n\n')), '## Lessons', ...lessons.map(lesson => [
    `### ${lesson.title} (${lesson.id})`, `Track: ${lesson.track}. Mode: ${lesson.mode ?? 'check'}.`, `${siteURL}/learn/${lesson.id}`,
    ...(safariLimitedLessons.has(lesson.id) ? ['Safari: this exercise has a known compiler stack limitation. Read it here or run it locally.'] : []),
    ...lesson.paragraphs, `Exercise: ${lesson.task}`, 'Starter:', leanBlock(lesson.starter), `Hint: ${lesson.hint}`, 'Solution:', leanBlock(lesson.solution),
  ].join('\n\n')), '## Syntax', ...syntax.map(item => `### ${item.title}\n\n${item.token}\n\n${item.explanation}\n${item.input ? `Input: ${item.input}\n` : ''}${leanBlock(item.code)}`)].join('\n\n');
}
