import type { Example } from './content';

const checked = 'File checked successfully.';
export const advancedExamples: Example[] = [
  {
    id: 'proof-efficiency-slow', title: 'Efficiency: calculate the proof', file: 'CalculateLength.lean', category: 'Advanced Lean', mode: 'check',
    description: 'Prove a concrete list length by reducing a decision procedure.',
    code: `-- Compare this file with ReuseLengthTheorem.lean.
-- Both files prove exactly the same proposition.
-- Check each more than once and compare the elapsed time in Output.

-- Keep this input small for browsers with limited call stacks.

theorem length_of_copies : (List.replicate 20 7).length = 20 := by
  decide

-- decide constructs a proof by reducing the decision procedure.
-- Here that means building and traversing a 20-element list.
-- The kernel must check the resulting proof as well.
-- A higher heartbeat limit allows more work; it does not make it faster.
`, expected: checked,
    concepts: [{ token: 'by decide', explanation: 'Proves this closed proposition through computation. The decision procedure computes the list length; a general lemma avoids that calculation.' }, { token: 'Browser limits', explanation: 'This example keeps the list short because browser call stacks are limited. Raising Lean’s maxRecDepth or maxHeartbeats cannot enlarge the browser’s stack.' }, { token: 'Elapsed time', explanation: 'Output reports the whole check, including elaboration and kernel checking. Compare repeated warm runs on the same device; this is not an isolated kernel benchmark.' }],
    challenge: 'Open the companion example and compare the two checks. Try a smaller list in both files.', related: ['proof-efficiency-fast'],
    references: [{ title: 'Lean tactic reference: decide', url: 'https://lean-lang.org/doc/reference/latest/Tactic-Proofs/Tactic-Reference/' }],
  },
  {
    id: 'proof-efficiency-fast', title: 'Efficiency: reuse a theorem', file: 'ReuseLengthTheorem.lean', category: 'Advanced Lean', mode: 'check',
    description: 'Prove the same list length without computing the list.',
    code: `-- Same proposition as CalculateLength.lean; a different proof.
-- The library already proves this for every length and element.

theorem length_of_copies : (List.replicate 20 7).length = 20 := by
  exact List.length_replicate

-- Lean instantiates a general theorem instead of computing 20 cells.
-- The kernel checks this application; no proof is skipped.
-- No increased recursion or heartbeat limits are needed.

-- Other useful habits:
-- * Use exact when you already have a theorem with the required type.
-- * Use simp? to find the lemmas, then try the suggested simp only.
-- * Name intermediate facts with have instead of repeating proof search.
-- * Measure: a shorter proof script is not automatically a faster proof.
`, expected: checked,
    concepts: [{ token: 'exact List.length_replicate', explanation: 'Lean infers the length and element from the goal. It checks an application of an existing theorem, avoiding reduction of the list.' }, { token: 'simp? · simp only', explanation: 'simp? can suggest a sufficient list of simplification lemmas. An explicit list can reduce search and make a proof more predictable, but measure the result.' }, { token: 'Checking versus execution', explanation: 'This example optimizes proving a statement. Tail recursion and array reuse address a different cost: running a program.' }],
    challenge: 'Change 20 to 200000. This proof still applies without constructing the list. Avoid making that change in the calculation example on a phone.',
    related: ['proof-efficiency-slow', 'tail-recursion', 'simp-example'],
    references: [{ title: 'Simplification tactics', url: 'https://lean-lang.org/doc/reference/latest/Tactic-Proofs/Tactic-Reference/' }],
  },
  {
    id: 'tail-recursion', title: 'Efficiency: tail recursion', file: 'TailRecursion.lean', category: 'Advanced Lean', mode: 'program',
    description: 'Write two equivalent sums and prove the accumulator invariant.',
    code: `def sumRecursive : List Nat → Nat
  | [] => 0
  | x :: xs => x + sumRecursive xs

def sumLoop : List Nat → Nat → Nat
  | [], acc => acc
  | x :: xs, acc => sumLoop xs (acc + x)

def sumTail (xs : List Nat) : Nat := sumLoop xs 0

-- Generalize the accumulator: each recursive call changes it.
theorem sumLoop_spec (xs : List Nat) (acc : Nat) :
    sumLoop xs acc = acc + sumRecursive xs := by
  induction xs generalizing acc with
  | nil => simp [sumLoop, sumRecursive]
  | cons x xs ih => simp [sumLoop, sumRecursive, ih, Nat.add_assoc]

-- This proves agreement for every list, not just the test below.
theorem same_sum (xs : List Nat) : sumTail xs = sumRecursive xs := by
  simp [sumTail, sumLoop_spec]

def main : IO Unit := do
  let values := List.range 101
  IO.println s!"Recursive: {sumRecursive values}"
  IO.println s!"Tail recursive: {sumTail values}"
`, expected: 'Recursive: 5050\nTail recursive: 5050',
    concepts: [{ token: 'x + sumRecursive xs', explanation: 'The recursive call leaves an addition to perform afterward. Both algorithms do linear work, but this version builds a chain of pending calls.' }, { token: 'sumLoop xs (acc + x)', explanation: 'The recursive call is the final operation. Lean’s compiler can use a loop and avoid a growing call stack. Small inputs may not show a measurable time difference.' }, { token: 'induction xs generalizing acc', explanation: 'Keeps the accumulator arbitrary in the induction hypothesis so it applies to acc + x in the recursive case.' }, { token: 'same_sum', explanation: 'Proves equality for all lists. Running main checks two concrete computations; the theorem establishes the general relationship.' }],
    challenge: 'Use List.range 10 and verify the sum is 45. Read the accumulator proof before changing the algorithm.', related: ['proof-efficiency-fast'],
    references: [{ title: 'Tail recursion', url: 'https://lean-lang.org/functional_programming_in_lean/Programming___-Proving___-and-Performance/Tail-Recursion/' }, { title: 'Induction and recursion', url: 'https://lean-lang.org/theorem_proving_in_lean4/Induction-and-Recursion/' }],
  },
];
