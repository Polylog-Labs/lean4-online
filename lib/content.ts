import { mathExamples } from './math-examples';
import { firstProofExamples, smallExamples } from './learning-examples';
import { advancedExamples } from './advanced-examples';
import { hashExamples } from './hash-examples';
import { introductoryLessons, furtherLessons } from './extra-lessons';
export type ExecutionMode = 'program' | 'check';
export interface Example {
  id: string; title: string; file: string; category: 'Getting started' | 'Programs' | 'Proofs' | 'Classic mathematics' | 'Number theory' | 'Counting & logic' | 'Algebra & fields' | 'Cryptography' | 'Advanced Lean';
  description: string; code: string; mode: ExecutionMode; expected: string;
  concepts: { token: string; explanation: string }[];
  challenge: string;
  incomplete?: true;
  related?: string[];
  references?: { title: string; url: string }[];
  history?: { top100?: number; milestone: string; fact: string; scope: string; scopeLabel: string; source: string; sourceTitle: string };
}
export const examples: Example[] = [
  {
    id: 'welcome', title: 'Welcome', file: 'Welcome.lean', category: 'Getting started', mode: 'program',
    description: 'Run a program, check a proof, and find your way around leanlab.',
    code: `-- Welcome to leanlab. This is a runnable Lean file.\n-- Choose Run to check the proof and execute main.\n-- First use downloads the Lean compiler (~46 MB), cached for later runs.\n-- It runs as WebAssembly on your device. Your code is not uploaded.\n\ndef double (n : Nat) : Nat := n + n\n\n-- A proof: double n is equal to n + n by definition.\n-- rfl stands for reflexivity.\nexample (n : Nat) : double n = n + n := by\n  rfl\n\ndef main : IO Unit := do\n  IO.println "Welcome to leanlab."\n  IO.println (double 21)\n\n/-\nExamples   Browse editable programs and proofs.\nPlayground Create, rename, and download your own files.\nLearn      Follow lessons and check your exercises.\nSyntax     Look up Lean keywords and mathematical symbols.\n\nOpen Guide for an explanation of this file.\nRun locally explains how to use Lean on your computer.\nYour files and lesson progress are saved on this device.\n-/\n`,
    expected: 'Welcome to leanlab.\n42',
    concepts: [{ token: 'def', explanation: 'Defines a value or a function. double accepts a natural number and returns its sum with itself.' }, { token: 'example … := by rfl', explanation: 'States an unnamed proposition and proves it by reflexivity: both sides reduce to the same expression.' }, { token: 'main : IO Unit', explanation: 'The entry point of a program. IO.println writes a line to Output.' }],
    challenge: 'Change 21 to another natural number and run the file again. Then open Learn for guided exercises.',
  },
  ...firstProofExamples,
  {
    id: 'hello', title: 'Hello, world', file: 'Hello.lean', category: 'Getting started', mode: 'program',
    description: 'Define a function and print its result from main.',
    code: `-- Define a greeting function and run it from main.\n\ndef greet (name : String) : String :=\n  s!"Hello, {name}!"\n\ndef main : IO Unit := do\n  IO.println (greet "world")\n  IO.println "Welcome to Lean Lab."\n`,
    expected: 'Hello, world!\nWelcome to Lean Lab.',
    concepts: [
      { token: 'def', explanation: 'Introduces a definition. Here, greet is a function and main is the program’s entry point.' },
      { token: '(name : String)', explanation: 'A parameter and its type. This function accepts a string named name.' },
      { token: ': String :=', explanation: 'The return type comes after a colon. The expression after := supplies the value.' },
      { token: 's!"…{name}…"', explanation: 'String interpolation inserts the value of name into the greeting.' },
      { token: 'IO Unit', explanation: 'An IO action that returns Unit, a type with the single value ().' },
      { token: 'do', explanation: 'Sequences actions. Indentation groups the two lines into one program.' },
    ], challenge: 'Change "world" to your name, then run the program again.',
  },
  {
    id: 'expressions', title: 'Values & types', file: 'Values.lean', category: 'Getting started', mode: 'check',
    description: 'Evaluate expressions with #eval and inspect their types with #check.',
    code: `-- #eval runs an expression\n#eval 6 * 7\n#eval "Lean" ++ " is a language"\n#eval [1, 2, 3].length\n\n-- #check reports a type\n#check 42\n#check "hello"\n#check true\n`, expected: '42\n"Lean is a language"\n3\n42 : Nat\n"hello" : String\nBool.true : Bool',
    concepts: [{ token: '#eval', explanation: 'Evaluates an expression and shows the result in the message output.' }, { token: '#check', explanation: 'Elaborates an expression and shows its type without running it.' }, { token: '++', explanation: 'Appends strings or lists. Lean chooses the operation from the types.' }], challenge: 'Evaluate 2 ^ 10. Then check the type of [1, 2, 3].',
  },
  {
    id: 'functions', title: 'Writing functions', file: 'Functions.lean', category: 'Getting started', mode: 'program',
    description: 'Functions take inputs and return values. Application uses spaces, so parentheses group expressions.',
    code: `def double (n : Nat) : Nat :=\n  n * 2\n\ndef add (a b : Nat) : Nat :=\n  a + b\n\ndef main : IO Unit := do\n  IO.println (double 21)\n  IO.println (add 10 32)\n  IO.println (double (add 3 4))\n`, expected: '42\n42\n14',
    concepts: [{ token: 'Nat', explanation: 'The natural numbers: 0, 1, 2, and so on. Nat has no negative values.' }, { token: '(a b : Nat)', explanation: 'Two parameters sharing the same type.' }, { token: 'double (add 3 4)', explanation: 'Calls add first, then passes the result to double. Function arguments are separated by spaces.' }], challenge: 'Define triple, then print triple (double 7).',
  },
  {
    id: 'fibonacci', title: 'Fibonacci', file: 'Fibonacci.lean', category: 'Programs', mode: 'program',
    description: 'Turn the mathematical definition of Fibonacci numbers into a recursive program.',
    code: `def fib : Nat → Nat\n  | 0 => 0\n  | 1 => 1\n  | n + 2 => fib n + fib (n + 1)\n\ndef main : IO Unit := do\n  for i in List.range 10 do\n    IO.println s!"fib({i}) = {fib i}"\n`, expected: 'fib(0) = 0\nfib(1) = 1\nfib(2) = 1\nfib(3) = 2\nfib(4) = 3\nfib(5) = 5\nfib(6) = 8\nfib(7) = 13\nfib(8) = 21\nfib(9) = 34',
    concepts: [{ token: 'Nat → Nat', explanation: 'A function from natural numbers to natural numbers. Type \\to and accept the suggestion to insert →.' }, { token: '| pattern =>', explanation: 'Pattern matching chooses a branch based on the input.' }, { token: 'for … in … do', explanation: 'Repeats an action for every element. List.range 10 contains 0 through 9.' }], challenge: 'Print the first 12 Fibonacci numbers. This deliberately simple implementation repeats work for large inputs.',
  },
  {
    id: 'lists', title: 'Lists & pipelines', file: 'Lists.lean', category: 'Programs', mode: 'program',
    description: 'Build a small data pipeline with immutable lists and higher-order functions.',
    code: `def scores : List Nat := [12, 7, 24, 3, 18]\n\ndef main : IO Unit := do\n  let doubled := scores.map (fun n => n * 2)\n  let high := scores.filter (fun n => n > 10)\n  let total := scores.foldl (fun acc n => acc + n) 0\n  IO.println s!"Doubled: {doubled}"\n  IO.println s!"Above 10: {high}"\n  IO.println s!"Total: {total}"\n`, expected: 'Doubled: [24, 14, 48, 6, 36]\nAbove 10: [12, 24, 18]\nTotal: 64',
    concepts: [{ token: 'List Nat', explanation: 'A list whose elements all have type Nat. Types can themselves take parameters.' }, { token: 'fun n =>', explanation: 'An anonymous function, useful when passing behavior into map or filter.' }, { token: 'let', explanation: 'Introduces a local value. Lean usually infers its type from the expression.' }], challenge: 'Change the filter to keep scores above 15.',
  },
  {
    id: 'matching', title: 'Pattern matching', file: 'Patterns.lean', category: 'Programs', mode: 'program',
    description: 'Describe a small set of possibilities and handle each one explicitly.',
    code: `inductive Light where\n  | red\n  | amber\n  | green\n\ndef instruction (light : Light) : String :=\n  match light with\n  | .red => "Stop"\n  | .amber => "Get ready"\n  | .green => "Go"\n\ndef main : IO Unit := do\n  IO.println (instruction .red)\n  IO.println (instruction .green)\n`, expected: 'Stop\nGo',
    concepts: [{ token: 'inductive', explanation: 'Defines a new type by listing its constructors. Light has three possible values.' }, { token: 'match … with', explanation: 'Inspects a value. Lean checks that the cases cover every possible constructor.' }, { token: '.red', explanation: 'Constructor shorthand. Lean infers the namespace Light from the expected type.' }], challenge: 'Add a flashing constructor and update instruction to handle it.',
  },
  {
    id: 'structures', title: 'Structures', file: 'Structures.lean', category: 'Programs', mode: 'program',
    description: 'Group named fields into your own data type, then write a function that uses it.',
    code: `structure Point where\n  x : Int\n  y : Int\n  deriving Repr\n\ndef moveRight (p : Point) (distance : Int) : Point :=\n  { p with x := p.x + distance }\n\ndef main : IO Unit := do\n  let origin : Point := { x := 0, y := 0 }\n  let moved := moveRight origin 5\n  IO.println s!"Position: ({moved.x}, {moved.y})"\n`, expected: 'Position: (5, 0)',
    concepts: [{ token: 'structure', explanation: 'Defines a record with named fields. Point contains two integers.' }, { token: 'Int', explanation: 'Integers include negative and positive whole numbers, as well as zero.' }, { token: '{ p with x := … }', explanation: 'Creates an updated copy of p while keeping its other fields.' }], challenge: 'Add moveUp, then move the origin right 5 and up 3.',
  },
  {
    id: 'option', title: 'Handling missing values', file: 'Options.lean', category: 'Programs', mode: 'program',
    description: 'Option makes missing values explicit, so the compiler helps you handle both outcomes.',
    code: `def describe (input : String) : String :=\n  match input.toNat? with\n  | some n => s!"You entered {n}"\n  | none => "That is not a natural number"\n\ndef main : IO Unit := do\n  IO.println (describe "42")\n  IO.println (describe "hello")\n`, expected: 'You entered 42\nThat is not a natural number',
    concepts: [{ token: 'Option Nat', explanation: 'Either some n containing a number, or none representing a missing value.' }, { token: 'toNat?', explanation: 'Attempts to parse a natural number from a string. The question mark is part of the name.' }, { token: 'some / none', explanation: 'The two constructors of Option. Pattern matching forces us to consider both.' }], challenge: 'Try "-4" and "007" as inputs.',
  },
  {
    id: 'factorial', title: 'Factorial', file: 'Factorial.lean', category: 'Programs', mode: 'program',
    description: 'Lean checks that ordinary recursive definitions terminate.',
    code: `def factorial : Nat → Nat\n  | 0 => 1\n  | n + 1 => (n + 1) * factorial n\n\ndef main : IO Unit := do\n  for n in List.range 8 do\n    IO.println s!"{n}! = {factorial n}"\n`, expected: '0! = 1\n1! = 1\n2! = 2\n3! = 6\n4! = 24\n5! = 120\n6! = 720\n7! = 5040',
    concepts: [{ token: '| 0 => 1', explanation: 'The base case returns 1 without a recursive call.' }, { token: 'n + 1', explanation: 'Matches a successor. The recursive call uses n, which is structurally smaller.' }, { token: 'termination', explanation: 'Total recursive functions need a termination argument. Lean can infer it here.' }], challenge: 'Compare factorial 10 with factorial 11.',
  },
  {
    id: 'proof', title: 'Your first proof', file: 'FirstProof.lean', category: 'Proofs', mode: 'check',
    description: 'A theorem is a declaration whose type is a proposition. Lean checks the supplied proof.',
    code: `-- Two sides that compute to the same value\ntheorem two_plus_two : 2 + 2 = 4 := by\n  rfl\n\n-- A statement about every natural number\ntheorem add_zero (n : Nat) : n + 0 = n := by\n  rfl\n\n#check two_plus_two\n#check add_zero\n`, expected: 'two_plus_two : 2 + 2 = 4\nadd_zero (n : Nat) : n + 0 = n',
    concepts: [{ token: 'theorem', explanation: 'Introduces a named proposition together with its proof.' }, { token: 'by', explanation: 'Begins a tactic proof. Tactics construct a proof term that Lean checks.' }, { token: 'rfl', explanation: 'Short for reflexivity: a value equals itself. It proves equality when Lean can reduce both sides to the same expression.' }], challenge: 'Change 4 to 5 and check the file. Read why rfl cannot finish the proof.',
  },
  {
    id: 'logic', title: 'Implication & logic', file: 'Logic.lean', category: 'Proofs', mode: 'check',
    description: 'Use assumptions to construct proofs. An implication is a function from one proof to another.',
    code: `theorem identity_proof (P : Prop) : P → P := by\n  intro h\n  exact h\n\ntheorem swap_and (P Q : Prop) : P ∧ Q → Q ∧ P := by\n  intro h\n  constructor\n  · exact h.right\n  · exact h.left\n`, expected: 'File checked successfully.',
    concepts: [{ token: 'Prop', explanation: 'The type of propositions. P and Q stand for arbitrary propositions.' }, { token: 'intro h', explanation: 'To prove an implication, assume its premise and name the resulting hypothesis h.' }, { token: 'constructor', explanation: 'Builds a conjunction by asking for a proof of each side.' }, { token: 'exact', explanation: 'Supplies a term whose type matches the current goal.' }], challenge: 'Prove P → Q → P using two intro steps.',
  },
  {
    id: 'induction', title: 'Proof by induction', file: 'Induction.lean', category: 'Proofs', mode: 'check',
    description: 'Prove a property for all natural numbers using a base case and a successor case.',
    code: `theorem zero_add (n : Nat) : 0 + n = n := by\n  induction n with\n  | zero => rfl\n  | succ n ih =>\n    simp only [Nat.add_succ, ih]\n\n#check zero_add\n`, expected: 'zero_add (n : Nat) : 0 + n = n',
    concepts: [{ token: 'induction n with', explanation: 'Splits a proof into zero and successor cases, following Nat’s constructors.' }, { token: 'ih', explanation: 'The induction hypothesis: the property is already known for the smaller n.' }, { token: 'simp only [ … ]', explanation: 'Simplifies using the listed lemmas and built-in reductions, without the default simp lemma set.' }], challenge: 'Inspect the successor case and explain where the induction hypothesis is used.',
  },
  {
    id: 'verified', title: 'A program with a proof', file: 'Verified.lean', category: 'Proofs', mode: 'program',
    description: 'Write a function, prove a property about it, and execute it in the same file.',
    code: `def double (n : Nat) : Nat := n + n\n\n-- Every output is the sum of two equal numbers\ntheorem double_eq (n : Nat) : double n = n + n := by\n  rfl\n\n-- Check a concrete result\nexample : double 21 = 42 := by\n  decide\n\ndef main : IO Unit := do\n  IO.println s!"double 21 = {double 21}"\n  IO.println "The function above also has a checked proof."\n`, expected: 'double 21 = 42\nThe function above also has a checked proof.',
    concepts: [{ token: 'def + theorem', explanation: 'A function and a theorem can coexist. Proving a property does not replace executing the program.' }, { token: 'example', explanation: 'An unnamed declaration. Here it checks a proposition.' }, { token: 'decide', explanation: 'Solves a proposition using its decision procedure, which is suitable for this concrete equality.' }], challenge: 'Change double to n * 2. What happens to the rfl proof?',
  },
  ...smallExamples,
  ...mathExamples,
  ...hashExamples,
  ...advancedExamples,
  { id: 'core-math', title: 'Using the core math library', file: 'CoreMath.lean', category: 'Number theory', mode: 'check',
    description: 'Import a core module, reuse a library theorem, and prove a concrete large-number GCD equality.',
    code: `import Init.Data.Nat.Gcd\n\n-- Init ships with Lean. This example does not require Mathlib.\n-- Reuse a general theorem rather than proving it again.\nexample (a b : Nat) : Nat.gcd a b = Nat.gcd b a :=\n  Nat.gcd_comm a b\n\n-- A concrete equality, proved by a decision procedure.\nexample :\n    Nat.gcd (2^100 - 1) (2^60 - 1) = 2^20 - 1 := by\n  decide\n\n#eval Nat.gcd (2^100 - 1) (2^60 - 1)\n`, expected: '1048575',
    concepts: [{ token: 'import Init.Data.Nat.Gcd', explanation: 'Loads the core greatest-common-divisor module. Init is already available in this browser runtime.' }, { token: 'Nat.gcd_comm', explanation: 'A library theorem that proves the GCD is unchanged when its arguments are swapped. Its parameters are the two natural numbers.' }, { token: 'by decide', explanation: 'Proves this concrete equality using Lean’s decision procedure. norm_num is a different tactic supplied by Mathlib, which is not included here.' }, { token: 'Init · Std · Mathlib', explanation: 'Init is the core library. Std adds programming data structures and utilities. Mathlib is the community mathematics library, including algebraic hierarchies and analysis. Only Init is bundled here.' }], challenge: 'Change the exponents to 24, 16, and 8. Check the new equality and its numerical result.' },
  { id: 'notation', title: 'Reading mathematical notation', file: 'Notation.lean', category: 'Proofs', mode: 'check',
    description: 'Read quantified statements and construct their proofs.',
    code: `-- For every natural number n, there is a natural number m\n-- such that m is n + 1 and is greater than n.\nexample : ∀ n : Nat, ∃ m : Nat, m = n + 1 ∧ n < m := by\n  intro n\n  exact ⟨n + 1, rfl, by omega⟩\n\n-- “P and Q” holds if and only if “Q and P” holds.\nexample (P Q : Prop) : (P ∧ Q) ↔ (Q ∧ P) := by\n  constructor\n  · intro ⟨hp, hq⟩\n    exact ⟨hq, hp⟩\n  · intro ⟨hq, hp⟩\n    exact ⟨hp, hq⟩\n`, expected: 'File checked successfully.',
    concepts: [{ token: '∀ · ∃', explanation: '∀ means “for every”; ∃ means “there exists.” Read the bound variables from left to right. Here the witness m may depend on n.' }, { token: '∧ · ↔', explanation: '∧ joins two claims that must both hold. ↔ asks for implications in both directions.' }, { token: '⟨ … ⟩', explanation: 'Constructs a witness together with the required proofs, or combines proofs of a conjunction.' }, { token: 'Unicode input', explanation: 'Type \\forall, \\exists, \\and, or \\iff and accept the editor suggestion with Enter or Tab. Symbols are Lean source characters, not rendered LaTeX.' }], challenge: 'Use n + 2 as the witness in the first theorem and update the statement accordingly.' },
];

export const lessonTracks = ['Foundations', 'Programming', 'Proving', 'Cryptography', 'Advanced Lean'] as const;
export const trackDescriptions: Record<typeof lessonTracks[number], string> = {
  Foundations: 'First proofs, values, and functions', Programming: 'IO, recursion, and lists',
  Proving: 'Propositions and proof tactics', Cryptography: 'Hashes, collisions, and message digests',
  'Advanced Lean': 'Proof efficiency and program performance',
};
export interface Lesson {
  id: string; title: string; description: string; duration: string; track: typeof lessonTracks[number]; mode?: ExecutionMode;
  exampleId: string; paragraphs: string[]; task: string; starter: string; solution: string; validation: string; hint: string;
}
export const lessons: Lesson[] = [
  ...introductoryLessons,
  { id: 'values', title: 'Values and types', description: 'Values, types, and your first expression.', duration: '5 min', track: 'Foundations', exampleId: 'expressions',
    paragraphs: ['Lean is both a programming language and a proof assistant. You can calculate with it, write applications, and express claims that the type checker verifies.', 'Every expression has a type. Nat is the type of natural numbers. A colon introduces a type annotation, and := provides the value of a definition. #eval executes an expression; #check tells you its type.'],
    task: 'Define answer as a natural number equal to 42. Use a literal or an arithmetic expression.', starter: 'def answer : Nat := 0\n\n#eval answer\n', solution: 'def answer : Nat := 6 * 7\n\n#eval answer\n', validation: 'example : answer = 42 := by decide', hint: 'Replace 0 with 6 * 7. Nat multiplication uses *.' },
  { id: 'functions', title: 'Functions', description: 'Define functions with typed parameters.', duration: '7 min', track: 'Foundations', exampleId: 'functions',
    paragraphs: ['The declaration def double (n : Nat) : Nat := n * 2 describes a function. The parentheses bind an input named n, the next colon gives the output type, and the final expression computes the result.', 'Lean uses spaces for function application. double 21 applies the function to 21. Parentheses are for grouping: double (3 + 4).'],
    task: 'Implement triple so that it multiplies its natural-number input by three.', starter: 'def triple (n : Nat) : Nat :=\n  n\n\n#eval triple 14\n', solution: 'def triple (n : Nat) : Nat :=\n  n * 3\n\n#eval triple 14\n', validation: 'example : triple 0 = 0 := by decide\nexample : triple 7 = 21 := by decide\nexample : triple 14 = 42 := by decide', hint: 'The body can be n * 3. You do not need a return keyword.' },
  { id: 'io', title: 'Programs and IO', description: 'Define main and sequence IO actions with do.', duration: '8 min', track: 'Programming', mode: 'program', exampleId: 'hello',
    paragraphs: ['A Lean program has a main declaration. The type IO Unit describes an action that may perform input/output and finishes without a meaningful value. IO.println prints a line; do sequences several actions.', 'In this browser, Run program evaluates main with Lean’s #eval command in an isolated worker. On your computer, lean --run Main.lean runs main. A Lake executable target can compile the same program into a native binary.'],
    task: 'Define greeting as "Hello, Lean!", then run the main program that prints it.', starter: 'def greeting : String := "Hello"\n\ndef main : IO Unit := do\n  IO.println greeting\n', solution: 'def greeting : String := "Hello, Lean!"\n\ndef main : IO Unit := do\n  IO.println greeting\n', validation: 'example : greeting = "Hello, Lean!" := by rfl', hint: 'Change the string assigned to greeting. Run program executes the supplied main action.' },
  { id: 'matching', title: 'Pattern matching and recursion', description: 'Handle cases and write a recursive function.', duration: '10 min', track: 'Programming', exampleId: 'factorial',
    paragraphs: ['Pattern matching gives a separate equation for each shape of input. Natural numbers are either zero or a successor, written n + 1. These two cases cover every Nat.', 'A recursive function calls itself on smaller inputs. Lean checks termination, which matters because definitions also participate in its logic. A base case and a structurally smaller recursive call are enough here.'],
    task: 'Complete sumTo so sumTo 3 computes 3 + 2 + 1 + 0.', starter: 'def sumTo : Nat → Nat\n  | 0 => 0\n  | n + 1 => 0\n\n#eval sumTo 10\n', solution: 'def sumTo : Nat → Nat\n  | 0 => 0\n  | n + 1 => (n + 1) + sumTo n\n\n#eval sumTo 10\n', validation: 'example : sumTo 0 = 0 := by decide\nexample : sumTo 3 = 6 := by decide\nexample : sumTo 10 = 55 := by decide', hint: 'In the successor case, add (n + 1) to sumTo n.' },
  { id: 'lists', title: 'Lists and functions', description: 'Transform lists with anonymous functions.', duration: '8 min', track: 'Programming', exampleId: 'lists',
    paragraphs: ['List α is a list whose elements have type α. For example, List Nat holds natural numbers. List.map applies a function to each element and returns a new list.', 'fun n => n * 2 is an anonymous function. Lean can infer n’s type from the list you are mapping over. You can pass named functions to map as well.'],
    task: 'Make doubleAll double every number in its input list.', starter: 'def doubleAll (xs : List Nat) : List Nat :=\n  xs\n\n#eval doubleAll [1, 2, 3]\n', solution: 'def doubleAll (xs : List Nat) : List Nat :=\n  xs.map (fun n => n * 2)\n\n#eval doubleAll [1, 2, 3]\n', validation: 'example : doubleAll [] = [] := by decide\nexample : doubleAll [1, 2, 3] = [2, 4, 6] := by decide\nexample : doubleAll [7] = [14] := by decide', hint: 'Use xs.map with the anonymous function fun n => n * 2.' },
  { id: 'equality', title: 'Equality proofs', description: 'Propositions, theorem, by, and rfl.', duration: '7 min', track: 'Proving', exampleId: 'proof',
    paragraphs: ['A proposition is a type in Prop. A proof is a term of that type. A theorem declaration gives the proof a name, states its proposition after :, and supplies the proof term after :=.', 'by starts a tactic proof. rfl stands for reflexivity: a value equals itself (x = x). Lean can unfold definitions and compute to check that both sides reduce to the same expression. For example, rfl proves 2 + 2 = 4 because both sides reduce to 4.'],
    task: 'Replace sorry with a proof of 3 + 4 = 7.', starter: 'theorem seven : 3 + 4 = 7 := by\n  sorry\n', solution: 'theorem seven : 3 + 4 = 7 := by\n  rfl\n', validation: 'example : 3 + 4 = 7 := seven', hint: 'Both sides compute to 7, so rfl works. sorry is a placeholder and will not complete the lesson.' },
  { id: 'implication', title: 'Implication proofs', description: 'Build proofs with intro and exact.', duration: '9 min', track: 'Proving', exampleId: 'logic',
    paragraphs: ['To prove P → P, assume a proof of P and return it. This is the same shape as an identity function. intro h names the assumption; exact h supplies it as the solution.', 'Tactics transform the goal. When reading a proof, track which assumptions you have and what proposition remains to prove. Error diagnostics often show this proof state when a tactic fails.'],
    task: 'Prove P → Q → P for arbitrary propositions P and Q.', starter: 'theorem keep_first (P Q : Prop) : P → Q → P := by\n  sorry\n', solution: 'theorem keep_first (P Q : Prop) : P → Q → P := by\n  intro hp hq\n  exact hp\n', validation: 'example (P Q : Prop) : P → Q → P := keep_first P Q', hint: 'Introduce hp and hq, then exact hp. The second assumption is not needed.' },
  { id: 'verified', title: 'Proving program properties', description: 'Give an executable function a checked property.', duration: '10 min', track: 'Proving', mode: 'program', exampleId: 'verified',
    paragraphs: ['Lean lets executable definitions and mathematical statements refer to each other directly. A theorem can describe exactly what a function computes.', 'The proof below follows from the definition. This is a small first step toward verification: larger developments prove invariants, boundary conditions, and algorithmic correctness. A checked theorem establishes the stated property; it does not establish every possible property of a program.'],
    task: 'Finish inc_spec with rfl, then run the program.', starter: 'def inc (n : Nat) : Nat := n + 1\n\ntheorem inc_spec (n : Nat) : inc n = n + 1 := by\n  sorry\n\ndef main : IO Unit := do\n  IO.println s!"inc 41 = {inc 41}"\n', solution: 'def inc (n : Nat) : Nat := n + 1\n\ntheorem inc_spec (n : Nat) : inc n = n + 1 := by\n  rfl\n\ndef main : IO Unit := do\n  IO.println s!"inc 41 = {inc 41}"\n', validation: 'example (n : Nat) : inc n = n + 1 := inc_spec n', hint: 'Unfolding inc makes both sides identical. rfl performs that reduction for you.' },
  { id: 'notation', title: 'Mathematical symbols', description: 'Read quantifiers, logical connectives, and proof goals.', duration: '10 min', track: 'Proving', exampleId: 'notation',
    paragraphs: ['Lean uses Unicode characters directly in source code. Type a backslash abbreviation, such as \\forall, and accept the editor suggestion with Enter or Tab. You can also paste the symbol. Greek letters such as α and β are ordinary identifiers, often used for types.', 'Read ∀ n : Nat, ∃ m : Nat, n < m as “for every natural number n, there is a natural number m greater than n.” The witness m can depend on n. To prove it, introduce n and supply n + 1 together with a proof of the inequality.', 'P ∧ Q means both P and Q; P ∨ Q means at least one; ¬P means P implies False. P → Q is implication, while A → B is a function type for data. P ↔ Q requires proofs in both directions. In an error message, ⊢ marks the goal below the available assumptions.', 'Symbols can have different meanings in different contexts. ← extracts an action’s result in a do block, but reverses an equality in rw [← h]. ⟨…⟩ constructs a value based on its expected type. A leading · focuses a proof goal, while (· + 1) creates an anonymous function.'],
    task: 'Prove that every natural number has a larger natural number.', starter: 'theorem larger : ∀ n : Nat, ∃ m : Nat, n < m := by\n  sorry\n', solution: 'theorem larger : ∀ n : Nat, ∃ m : Nat, n < m := by\n  intro n\n  exact ⟨n + 1, by omega⟩\n', validation: 'example (n : Nat) : ∃ m : Nat, n < m := larger n', hint: 'Use intro n, then exact ⟨n + 1, by omega⟩. The angle brackets pair the witness with its proof.' },
  { id: 'libraries', title: 'Libraries and mathematical notation', description: 'Reuse library theorems and recognize Mathlib notation.', duration: '8 min', track: 'Proving', exampleId: 'core-math',
    paragraphs: ['import loads a module; open shortens names from a namespace. A declaration such as Nat.gcd_comm is an existing theorem that you can apply directly. #check Nat.gcd_comm displays its full type and parameters.', 'Init is Lean’s core library. Std adds programming tools, including maps and sets. Mathlib is a separate community mathematics library with definitions and theorems for algebra, number theory, geometry, and analysis. This browser currently includes Init, so import Mathlib and tactics such as norm_num are unavailable.', 'Mathlib code often uses ℕ, ℤ, ℚ, ℝ, and ℂ for natural, integer, rational, real, and complex numbers. Other common notation includes ∑ for a finite sum, ∏ for a finite product, ∫ for an integral, √ for a square root, ∪ for union, ∩ for intersection, and ⊆ for subset. The required imports, types, and opened notation scopes determine how these expressions are interpreted.', 'In declarations such as variable (R : Type*) [CommRing R], the square brackets request an instance giving R its ring operations and laws. In x : ℝ, the colon still means “has type.” Writing a symbol or inserting its editor completion does not load the library that defines it.'],
    task: 'Prove that swapping the arguments of Nat.gcd leaves the result unchanged by applying Nat.gcd_comm.', starter: 'import Init.Data.Nat.Gcd\n\ntheorem gcd_swap (a b : Nat) : Nat.gcd a b = Nat.gcd b a := by\n  sorry\n', solution: 'import Init.Data.Nat.Gcd\n\ntheorem gcd_swap (a b : Nat) : Nat.gcd a b = Nat.gcd b a := by\n  exact Nat.gcd_comm a b\n', validation: 'example (a b : Nat) : Nat.gcd a b = Nat.gcd b a := gcd_swap a b', hint: 'The library theorem already states the required equality. Use exact Nat.gcd_comm a b.' },
  ...furtherLessons,
];

export { syntax } from './syntax';
