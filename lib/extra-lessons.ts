import type { Lesson } from './content';
import { sha256Source } from './sha256-source';
import { lengthProof } from './proof-comparison';

export const introductoryLessons: Lesson[] = [
  {
    id: 'first-proof', title: 'Prove 2 + 2 = 4', description: 'Your first calculation and your first checked proof.', duration: '4 min', track: 'Foundations', exampleId: 'two-plus-two',
    paragraphs: ['Start with a fact you already know: 2 + 2 = 4. #eval 2 + 2 computes the answer. A theorem declaration also states an equality and asks Lean to check evidence for it.', 'Read theorem four : 2 + 2 = 4 := by as “define a proof named four of the proposition 2 + 2 = 4, using these tactics.” Here the numerals have type Nat, the natural numbers.', 'rfl stands for reflexivity: an expression equals itself. Lean reduces both sides to 4, so rfl proves this equality. It does not prove every true equation.', 'sorry marks a missing proof. Lean issues a warning, and this lesson remains unfinished until you replace it. After completing the proof, try changing 4 to 5 and read the error.'],
    task: 'Replace sorry with rfl to prove 2 + 2 = 4.',
    starter: '#eval 2 + 2\n\ntheorem four : 2 + 2 = 4 := by\n  sorry\n',
    solution: '#eval 2 + 2\n\ntheorem four : 2 + 2 = 4 := by\n  rfl\n',
    validation: 'example : 2 + 2 = 4 := four', hint: 'rfl works because both sides reduce to the same natural number.',
  },
  {
    id: 'curry-howard', title: 'Proofs are terms', description: 'Understand the Curry–Howard correspondence through an identity function.', duration: '6 min', track: 'Foundations', exampleId: 'curry-howard',
    paragraphs: ['The Curry–Howard correspondence connects logic with types: a proposition is a type, and a proof is a term of that type. In Lean, P : Prop says that P is a proposition; hp : P says that hp proves it.', 'An ordinary identity function has type Nat → Nat and body fun n => n. A proof of P → P has the same form: fun hp => hp. It accepts a proof of P and returns that proof.', 'More generally, a proof of P → Q is a function that turns a proof of P into a proof of Q. If hpq : P → Q and hp : P, then hpq hp has type Q. Tactics build these proof terms for you; Lean’s kernel checks their types.', 'Lean treats propositions differently from data: proofs in Prop are erased from compiled programs. This lets programs carry checked properties without executing the proof as part of main.'],
    task: 'Replace sorry with the identity function fun hp => hp. It must prove P → P for any proposition P.',
    starter: 'theorem identityProof (P : Prop) : P → P :=\n  sorry\n',
    solution: 'theorem identityProof (P : Prop) : P → P :=\n  fun hp => hp\n',
    validation: 'example (P : Prop) : P → P := identityProof P', hint: 'hp has type P. Returning hp therefore gives the required proof of P.',
  },
];

export const furtherLessons: Lesson[] = [
  {
    id: 'simplification', title: 'Simplification with simp', description: 'Unfold a definition and simplify its arithmetic.', duration: '7 min', track: 'Proving', exampleId: 'simp-example',
    paragraphs: ['simp rewrites with registered simplification lemmas and basic reductions. It simplifies goals such as 0 + n + 0 = n without requiring you to name every step.', 'simp [bump] additionally unfolds the definition bump. simp only [Nat.zero_add, Nat.add_zero] instead restricts the lemma set. The at h suffix directs simplification at a hypothesis.', 'Use simp? while exploring a proof to obtain a suggested simp only call. A focused lemma list can make the proof easier to maintain. Simplification is not a complete solver for all mathematics.'],
    task: 'Prove bump n = n by simplifying the definition of bump.',
    starter: 'def bump (n : Nat) : Nat := 0 + n + 0\n\ntheorem bump_eq (n : Nat) : bump n = n := by\n  sorry\n',
    solution: 'def bump (n : Nat) : Nat := 0 + n + 0\n\ntheorem bump_eq (n : Nat) : bump n = n := by\n  simp [bump]\n',
    validation: 'example (n : Nat) : bump n = n := bump_eq n', hint: 'The proof is simp [bump]. The brackets ask Lean to unfold bump before simplifying.',
  },
  {
    id: 'hashing-basics', title: 'Hashes and collisions', description: 'Use the core Hashable interface and identify its limits.', duration: '7 min', track: 'Cryptography', exampleId: 'hashing', mode: 'program',
    paragraphs: ['A hash maps an input to a fixed-size value. Lean’s built-in hash returns UInt64 and needs no additional library. A Hashable instance determines how each type is hashed.', 'Implementing the function below shows the basic API. In the related example, hashing 0 and 2^64 as Nat produces the same result even though the numbers differ. Such a pair is a collision.', 'Core hash supports data structures; it is not a cryptographic hash API. SHA-256 is designed to resist finding collisions or an input for a given digest. Hashing does not hide predictable inputs: an attacker can hash likely messages and compare the results. Collisions still exist because the output has a fixed size.', 'Comparing hashes does not prove that arbitrary inputs are equal. The checks for this exercise verify the requested implementation on several inputs; they do not prove collision resistance.'],
    task: 'Return hash text from fingerprint, then run main.',
    starter: 'def fingerprint (text : String) : UInt64 := 0\n\ndef main : IO Unit := do\n  IO.println (fingerprint "Lean")\n',
    solution: 'def fingerprint (text : String) : UInt64 := hash text\n\ndef main : IO Unit := do\n  IO.println (fingerprint "Lean")\n',
    validation: '#eval do\n  for text in ["", "Lean", "abc", "λ"] do\n    unless fingerprint text == hash text do\n      throw (IO.userError "fingerprint must return hash text")',
    hint: 'Replace 0 with hash text. Lean infers the String Hashable instance.',
  },
  {
    id: 'sha256-message', title: 'Hash a message with SHA-256', description: 'Compute a digest of UTF-8 text without installing a package.', duration: '8 min', track: 'Cryptography', exampleId: 'sha256', mode: 'program',
    paragraphs: ['SHA-256 produces 256 bits, commonly written as 64 hexadecimal characters. This file includes a small Lean implementation, so it runs with the existing browser compiler and requires no additional library download.', 'Edit message at the top of the file, then run main. SHA256.digest first encodes the string as UTF-8 bytes. A different encoding, an extra space, or a newline changes those bytes and usually changes the digest.', 'To detect changes, compare the digest with a reference received through a trusted channel. A hash does not encrypt the message, and an attacker who can replace both the message and the reference can defeat this comparison.', 'The implementation is educational and has reference-vector tests. Those tests do not prove its correctness for every input. The array and bitwise examples explain the syntax used in the implementation.'],
    task: 'Change message to "Lean" and run the program. The implementation below can stay as it is.',
    starter: `def message : String := "abc"\n\n${sha256Source}\ndef main : IO Unit := IO.println (SHA256.digest message)\n`,
    solution: `def message : String := "Lean"\n\n${sha256Source}\ndef main : IO Unit := IO.println (SHA256.digest message)\n`,
    validation: 'example : message = "Lean" := by decide',
    hint: 'Only the string on the first line needs changing. Then try "Lean" followed by a newline as a separate experiment.',
  },
  {
    id: 'proof-efficiency', title: 'Make proof checking faster', description: 'Compare two proofs of the same theorem and measure their checking times.', duration: '8 min', track: 'Advanced Lean', exampleId: 'proof-efficiency-fast', comparison: 'list-length',
    paragraphs: ['Both cards state the same theorem: a list containing n copies of 7 has length n. They use the same name and statement, so each is checked in a separate file. Change List size to update both statements together.', 'decide computes the list’s length while reducing a decision procedure. exact List.length_replicate applies a theorem already proved for every length and element, avoiding that calculation. Lean checks both proofs.', 'Choose Compare both proofs to measure them on your device. The comparison warms up each proof, then alternates five measured checks of each and displays the median. Times include elaboration and kernel checking, but exclude compiler download and initialization. Small timings can vary between runs.', 'The exercise below fixes the length at 100. Replace the missing proof with the theorem application. Comparing the cards does not complete the exercise: use Check to validate your own proof.'],
    task: 'Replace sorry with a theorem application using List.length_replicate, then check the exercise.',
    starter: lengthProof(100, 'exercise'),
    solution: lengthProof(100, 'reuse'),
    validation: 'example : (List.replicate 100 7).length = 100 := copies_length',
    hint: 'exact List.length_replicate matches the goal. No extra limits are required.',
  },
  {
    id: 'tail-recursion', title: 'Accumulators and invariants', description: 'Prove a tail-recursive loop agrees with a recursive definition.', duration: '12 min', track: 'Advanced Lean', exampleId: 'tail-recursion',
    paragraphs: ['A tail-recursive call is the final operation in its branch. Moving pending work into an accumulator allows Lean’s compiler to use a loop instead of a growing call stack.', 'Both sums in the related example perform linear work. The main benefit here is stack usage, not a guaranteed speedup for every input. Execution performance and proof-checking performance are separate measurements.', 'An accumulator changes on each recursive call. induction xs generalizing acc keeps the induction hypothesis valid for any accumulator. The resulting invariant states sumLoop xs acc = acc + sumRecursive xs.', 'The exercise gives a general accumulator invariant as a hypothesis. Specialize it at zero and simplify to obtain the user-facing correctness statement. The related example proves the invariant itself.'],
    task: 'Use h xs 0 to prove loop xs 0 = sum xs.',
    starter: 'theorem from_invariant\n    (loop : List Nat → Nat → Nat) (sum : List Nat → Nat)\n    (h : ∀ xs acc, loop xs acc = acc + sum xs)\n    (xs : List Nat) : loop xs 0 = sum xs := by\n  sorry\n',
    solution: 'theorem from_invariant\n    (loop : List Nat → Nat → Nat) (sum : List Nat → Nat)\n    (h : ∀ xs acc, loop xs acc = acc + sum xs)\n    (xs : List Nat) : loop xs 0 = sum xs := by\n  simpa only [Nat.zero_add] using h xs 0\n',
    validation: 'example (loop : List Nat → Nat → Nat) (sum : List Nat → Nat)\n    (h : ∀ xs acc, loop xs acc = acc + sum xs) (xs : List Nat) :\n    loop xs 0 = sum xs := from_invariant loop sum h xs',
    hint: 'Use simpa only [Nat.zero_add] using h xs 0. It simplifies the specialized invariant to the goal.',
  },
];
