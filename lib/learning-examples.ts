import type { Example } from './content';

const checked = 'File checked successfully.';
const propositions = { title: 'Propositions and proofs', url: 'https://lean-lang.org/theorem_proving_in_lean4/Propositions-and-Proofs/' };

export const firstProofExamples: Example[] = [
  {
    id: 'two-plus-two', title: 'Prove 2 + 2 = 4', file: 'TwoPlusTwo.lean', category: 'Getting started', mode: 'check',
    description: 'Compute an answer, then prove the equality.',
    code: `-- #eval calculates a value. It prints 4.
#eval 2 + 2

-- theorem names a proof; : introduces its proposition.
-- Lean infers Nat (natural numbers) for these numerals.
theorem two_plus_two : 2 + 2 = 4 := by
  rfl

-- rfl stands for reflexivity: an expression equals itself.
-- Both sides reduce to 4, so Lean accepts the proof.
-- Change 4 to 5 above and check the file to see an error.

-- Reuse the named proof as a term of the required type.
example : 2 + 2 = 4 := two_plus_two
`, expected: '4',
    concepts: [{ token: '#eval', explanation: 'Executes an expression and displays its value. Evaluating 2 + 2 and proving an equality are separate commands.' }, { token: 'theorem … : … := …', explanation: 'Gives a proof a name, states the proposition after :, and supplies the proof after :=.' }, { token: 'by rfl', explanation: 'Starts a tactic proof and uses reflexivity. Lean checks that the two sides reduce to the same expression.' }],
    challenge: 'Add a named proof that 3 + 3 = 6. Then try an incorrect result and read the diagnostic.',
    related: ['curry-howard', 'sorry-example'], references: [propositions],
  },
  {
    id: 'curry-howard', title: 'Curry–Howard correspondence', file: 'CurryHoward.lean', category: 'Getting started', mode: 'check',
    description: 'A proposition is a type; a proof is a term of that type.',
    code: `-- An ordinary function takes a value and returns it.
def keepNumber : Nat → Nat := fun n => n

-- A proof of P → P takes a proof of P and returns it.
theorem keepProof (P : Prop) : P → P := fun hp => hp

-- The same proof, written with tactics.
example (P : Prop) : P → P := by
  intro hp
  exact hp

-- Function application also applies an implication.
theorem applyProof (P Q : Prop) (hpq : P → Q) (hp : P) : Q :=
  hpq hp

-- These are two proofs of the same concrete proposition.
example : 2 + 2 = 4 := rfl
example : 2 + 2 = 4 := keepProof (2 + 2 = 4) rfl

#eval keepNumber 42
`, expected: '42',
    concepts: [{ token: 'P : Prop', explanation: 'P is a proposition. A term hp : P is a proof of P. This is the propositions-as-types view of the Curry–Howard correspondence.' }, { token: 'P → Q', explanation: 'An implication is a function from proofs of P to proofs of Q. Applying hpq to hp produces a proof of Q.' }, { token: 'fun hp => hp', explanation: 'The identity function works for proofs as well as data. A tactic proof builds a proof term that Lean’s kernel checks.' }, { token: 'Prop · Type', explanation: 'Lean distinguishes propositions from data types. Proofs in Prop are erased from compiled programs; the correspondence does not mean proofs are printed when main runs.' }],
    challenge: 'Write a proof of P → Q → P using fun hp _hq => hp.', related: ['two-plus-two', 'logic'], references: [propositions],
  },
];

export const smallExamples: Example[] = [
  {
    id: 'sorry-example', title: 'An unfinished proof: sorry', file: 'Sorry.lean', category: 'Proofs', mode: 'check', incomplete: true,
    description: 'See the warning for an admitted statement, then replace the placeholder.',
    code: `-- This file intentionally has an unfinished proof.
-- Check it: Problems reports "declaration uses 'sorry'".
theorem unfinished : 2 + 2 = 4 := by
  sorry

-- This calculation works even though the proof is unfinished.
#eval 2 + 2

-- Replace sorry with rfl and check again.
-- sorry can even admit a false statement: it is not evidence.
`, expected: '4',
    concepts: [{ token: 'sorry', explanation: 'Temporarily admits a claim and produces a warning. The file can elaborate, but its proof is unfinished. leanlab marks it Incomplete and does not award lesson completion.' }, { token: '#eval 2 + 2', explanation: 'This independent calculation still prints 4. Successful execution does not fill the missing proof.' }],
    challenge: 'Replace sorry with rfl. The warning and Incomplete status should disappear.', related: ['two-plus-two', 'simp-example'],
  },
  {
    id: 'simp-example', title: 'Simplify with simp', file: 'Simplification.lean', category: 'Proofs', mode: 'check',
    description: 'Simplify expressions with library lemmas and selected definitions.',
    code: `-- simp repeatedly applies registered simplification lemmas.
example (n : Nat) : 0 + n + 0 = n := by
  simp

-- simp only makes the lemma list explicit.
example (n : Nat) : 0 + n + 0 = n := by
  simp only [Nat.zero_add, Nat.add_zero]

def addZero (n : Nat) : Nat := 0 + n

-- [addZero] asks simp to unfold this definition.
example (n : Nat) : addZero n = n := by
  simp [addZero]

-- Simplify a hypothesis, then use it to finish the goal.
example (n : Nat) (h : n + 0 = 8) : n = 8 := by
  simp only [Nat.add_zero] at h
  exact h
`, expected: checked,
    concepts: [{ token: 'simp', explanation: 'Rewrites toward simpler forms using tagged lemmas and simplification procedures. It may close a goal, but it is not a procedure for proving every true statement.' }, { token: 'simp [addZero]', explanation: 'Adds the defining equations of addZero to the simplification rules.' }, { token: 'simp only […] at h', explanation: 'Restricts the lemma set and simplifies the hypothesis named h. Without at h, the tactic simplifies the goal.' }],
    challenge: 'Add a proof that addZero (addZero n) = n using simp [addZero].', related: ['proof-efficiency-fast', 'proof-calculations'],
    references: [{ title: 'Simplification tactics', url: 'https://lean-lang.org/doc/reference/latest/Tactic-Proofs/Tactic-Reference/' }],
  },
  {
    id: 'proof-calculations', title: 'have, rw, and calc', file: 'Calculations.lean', category: 'Proofs', mode: 'check',
    description: 'Name intermediate facts and justify each step of an equality.',
    code: `example (a b c : Nat) (hab : a = b) (hbc : b = c) :
    a + 1 = c + 1 := by
  have hac : a = c := by
    calc
      a = b := hab
      _ = c := hbc
  rw [hac]

-- rw [← h] uses an equality from right to left.
example (a b : Nat) (h : a = b) : b + 0 = a := by
  rw [← h]
  rfl
`, expected: checked,
    concepts: [{ token: 'have hac : a = c := by', explanation: 'Creates a local fact with its own proof. Later proof steps can refer to hac.' }, { token: 'calc · _', explanation: 'Chains justified relations. The underscore in the next line stands for the previous right-hand side.' }, { token: 'rw [← h]', explanation: 'Rewrites using h in the reverse direction. This ← has a different role from extracting a result in a do block.' }],
    challenge: 'Change + 1 to + 2 in the first statement. The same proof should still work.', related: ['simp-example'],
  },
  {
    id: 'except-example', title: 'Parsing with error messages', file: 'Parsing.lean', category: 'Programs', mode: 'program',
    description: 'Use Except and do to return a value or an explanation of failure.',
    code: `def parseNumber (text : String) : Except String Nat :=
  match text.toNat? with
  | some n => .ok n
  | none => .error s!"Not a natural number: {text}"

def addText (a b : String) : Except String Nat := do
  let x ← parseNumber a
  let y ← parseNumber b
  return x + y

def describe (result : Except String Nat) : String :=
  match result with
  | .ok n => s!"Sum: {n}"
  | .error message => message

def main : IO Unit := do
  IO.println (describe (addText "20" "22"))
  IO.println (describe (addText "twenty" "22"))
`, expected: 'Sum: 42\nNot a natural number: twenty',
    concepts: [{ token: 'Except String Nat', explanation: 'Contains either .ok with a natural number or .error with an error string.' }, { token: 'let x ← parseNumber a', explanation: 'In an Except do block, extracts a successful result. An error ends the computation and propagates automatically.' }, { token: '.ok · .error', explanation: 'Constructor names inferred from the expected type. Matching handles both outcomes explicitly.' }],
    challenge: 'Reject the number zero with a separate error message.', related: ['option'],
  },
  {
    id: 'array-example', title: 'Arrays and bounds', file: 'Arrays.lean', category: 'Programs', mode: 'program',
    description: 'Build an array and access an element with a checked bound.',
    code: `def squares (count : Nat) : Array Nat := Id.run do
  let mut result := #[]
  for i in [0:count] do
    result := result.push (i * i)
  return result

def atOr (xs : Array Nat) (i fallback : Nat) : Nat :=
  if h : i < xs.size then
    xs[i]'h
  else
    fallback

def main : IO Unit := do
  let xs := squares 5
  IO.println s!"Squares: {xs.toList}"
  IO.println (atOr xs 3 999)
  IO.println (atOr xs 10 999)
`, expected: 'Squares: [0, 1, 4, 9, 16]\n9\n999',
    concepts: [{ token: 'Id.run do', explanation: 'Allows do notation and local mutable variables in a pure function.' }, { token: '[0:count]', explanation: 'A range beginning at zero and ending before count.' }, { token: "if h : … · xs[i]'h", explanation: 'Names the condition’s proof in the true branch. The array access uses h to establish that i is in bounds.' }],
    challenge: 'Produce cubes instead of squares. Keep the out-of-bounds fallback.', related: ['verified'],
  },
  {
    id: 'typeclass-example', title: 'Type classes and instances', file: 'TypeClasses.lean', category: 'Programs', mode: 'program',
    description: 'Write one function whose behavior depends on the input type.',
    code: `class Describe (α : Type) where
  describe : α → String

instance : Describe Nat where
  describe n := s!"Natural number: {n}"

instance : Describe Bool where
  describe b := if b then "yes" else "no"

def report {α : Type} [Describe α] (value : α) : String :=
  Describe.describe value

def main : IO Unit := do
  IO.println (report (42 : Nat))
  IO.println (report true)
`, expected: 'Natural number: 42\nyes',
    concepts: [{ token: 'class · instance', explanation: 'The class declares an interface. Each instance supplies its implementation for a particular type.' }, { token: '{α : Type}', explanation: 'An implicit type parameter, usually inferred from value.' }, { token: '[Describe α]', explanation: 'An instance parameter resolved by Lean’s type class search. This mechanism also supplies operations and laws in mathematical libraries.' }],
    challenge: 'Add a Describe String instance and call report on a string.', related: ['structures'],
  },
];
