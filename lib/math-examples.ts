import type { Example } from './content';

type Entry = {
  id: string; title: string; file: string; category?: Example['category'];
  top100?: number; milestone: string; fact: string; scope: string; scopeLabel: string;
  description: string; body: string; challenge: string;
  concepts?: Example['concepts']; mode?: Example['mode']; expected?: string;
  source?: string; sourceTitle?: string;
};
const listSource = 'https://lurch.plus/100/';
const entries: Entry[] = [
  {
    id: 'pythagoras', title: 'Pythagoras: the square identity', file: 'Pythagoras.lean', top100: 4,
    milestone: 'c. 500 BCE · Pythagorean tradition',
    fact: 'The familiar 3–4–5 triangle is one exact integer example.',
    scopeLabel: 'Algebraic proof', scope: 'Proves the square-area identity used in a rearrangement proof, and the 3–4–5 case. The geometric dissection itself is not formalized.',
    description: 'See how the area of a big square encodes a² + b² = c², then check an exact right-triangle example.',
    body: `-- A square of side a+b, minus four triangles of area a*b/2.
-- Writing twice the total area avoids fractions.
theorem rearrangement (a b : Int) :
    (a + b)^2 - 2*a*b = a^2 + b^2 := by
  grind

-- If the remaining square has area c², the identity follows.
theorem pythagoras_from_areas (a b c : Int)
    (area : c^2 = (a+b)^2 - 2*a*b) : a^2+b^2 = c^2 := by
  grind

example : (3 : Nat)^2 + 4^2 = 5^2 := by decide`,
    challenge: 'Check the 5–12–13 triangle, then explore the general triple generator in the library.',
  },
  {
    id: 'euler-modular', title: 'Euler’s theorem: modulo 10', file: 'EulerModular.lean', top100: 10, category: 'Number theory',
    milestone: '1760 · Euler; 1640 · Fermat', fact: 'Modulo 10, the invertible residues are exactly 1, 3, 7, and 9.',
    scopeLabel: 'Finite theorem', scope: 'Checks Euler’s theorem for every residue modulo 10 coprime to 10. This is not the theorem for arbitrary moduli.',
    description: 'Every unit modulo 10 raised to the fourth power returns to 1. Exhaust a finite type with a kernel-checked proof.',
    body: `-- phi(10) = 4: four residues are coprime to 10.
theorem euler_mod_ten :
    ∀ a : Fin 10, Nat.gcd a.val 10 = 1 → a^4 = 1 := by
  decide

#eval (7 : Fin 10)^4`, expected: '1',
    challenge: 'Try modulus 12, which also has four invertible residues. Change both occurrences of 10.',
  },
  {
    id: 'four-squares', title: 'Four squares: find a witness', file: 'FourSquares.lean', top100: 19, category: 'Number theory',
    milestone: '1770 · Lagrange', fact: 'Zero is allowed as a square, so “four” includes sums needing fewer terms.',
    scopeLabel: 'Worked example', scope: 'Proves an explicit four-square representation of 30 and runs a witness search. It does not prove existence for every natural number.',
    description: 'Build a search program, then supply an explicit witness that Lean checks independently.',
    body: `def fourSquares (n : Nat) : Option (Nat × Nat × Nat × Nat) := do
  for a in List.range (n+1) do
    for b in List.range (a+1) do
      for c in List.range (b+1) do
        for d in List.range (c+1) do
          if a*a + b*b + c*c + d*d == n then
            return (a, b, c, d)
  none

theorem thirty_is_four_squares :
    ∃ a b c d : Nat, 30 = a*a + b*b + c*c + d*d := by
  exact ⟨4, 3, 2, 1, by decide⟩

def main : IO Unit := do
  match fourSquares 30 with
  | some (a,b,c,d) => IO.println s!"30 = {a}² + {b}² + {c}² + {d}²"
  | none => IO.println "No witness found"`, mode: 'program', expected: '30 = 4² + 3² + 2² + 1²',
    challenge: 'Search for a representation of 23, then write a separate theorem using its four witnesses.',
  },
  {
    id: 'pythagorean-triples', title: 'Generate Pythagorean triples', file: 'PythagoreanTriples.lean', top100: 23,
    milestone: 'c. 300 BCE · Euclid', fact: 'Choosing m=2 and n=1 produces the triple 3, 4, 5.',
    scopeLabel: 'General identity', scope: 'Proves that Euclid’s formula satisfies the equation for all integer parameters. Classification and primitiveness of triples are not claimed.',
    description: 'Prove the generator once for arbitrary integers, then run it to produce infinitely many parameterized solutions.',
    body: `theorem triple_identity (m n : Int) :
    (m^2-n^2)^2 + (2*m*n)^2 = (m^2+n^2)^2 := by
  grind

def main : IO Unit := do
  for m in [2, 3, 4, 5] do
    let n := 1
    IO.println s!"{m*m-n*n}, {2*m*n}, {m*m+n*n}"`, mode: 'program', expected: '3, 4, 5\n8, 6, 10\n15, 8, 17\n24, 10, 26',
    challenge: 'Let n vary too. Which outputs have a common factor?',
  },
  {
    id: 'am-gm', title: 'Arithmetic & geometric means', file: 'Means.lean', top100: 38,
    milestone: 'Date unspecified in the list · Cauchy / Pólya proofs', fact: 'The difference between the two sides is a perfect square.',
    scopeLabel: 'Two-variable theorem', scope: 'Proves 4ab ≤ (a+b)² over all integers. For nonnegative a,b this is the squared two-variable AM–GM inequality.',
    description: 'A nonnegative square is enough to explain why the arithmetic mean dominates the geometric mean.',
    body: `theorem two_variable_am_gm (a b : Int) :
    4*a*b ≤ (a+b)^2 := by
  have square_nonnegative := Int.sq_nonneg (a-b)
  grind

-- Equality occurs when the two inputs agree.
example (a : Int) : 4*a*a = (a+a)^2 := by grind`,
    challenge: 'Prove that a² + b² is at least 2ab using the same square.',
  },
  {
    id: 'pell', title: 'Pell’s equation: a next solution', file: 'Pell.lean', top100: 39, category: 'Number theory',
    milestone: '1759 · Euler milestone in the list', fact: 'Starting at (3,2), the recurrence gives (17,12), then (99,70).',
    scopeLabel: 'Recurrence proof', scope: 'Proves that the displayed recurrence preserves x² − 2y² = 1. It does not classify all Pell solutions.',
    description: 'Turn one integer solution into another, and prove the transformation preserves the equation.',
    body: `theorem pell_step (x y : Int) (h : x^2 - 2*y^2 = 1) :
    (3*x+4*y)^2 - 2*(2*x+3*y)^2 = 1 := by
  grind

example : (3 : Int)^2 - 2*2^2 = 1 := by decide
example : (17 : Int)^2 - 2*12^2 = 1 := by decide`,
    challenge: 'Write main to print five steps of this recurrence.',
  },
  {
    id: 'binomial', title: 'The binomial theorem: squares', file: 'Binomial.lean', top100: 44,
    milestone: '1665 · Newton’s generalized expansion', fact: 'The coefficient 2 counts the two cross terms ab and ba.',
    scopeLabel: 'Fixed-degree identities', scope: 'Proves the square and cube expansions for all integers. Arbitrary exponents and generalized infinite expansions are outside this file.',
    description: 'Expand a square and a cube. Lean’s core grind tactic normalizes polynomial expressions.',
    body: `theorem binomial_square (a b : Int) :
    (a+b)^2 = a^2 + 2*a*b + b^2 := by
  grind

theorem binomial_cube (a b : Int) :
    (a+b)^3 = a^3 + 3*a^2*b + 3*a*b^2 + b^3 := by
  grind`,
    challenge: 'Write the fourth-power expansion. Try a wrong coefficient and inspect Lean’s feedback.',
  },
  {
    id: 'cayley-hamilton', title: 'Cayley–Hamilton in 2 × 2', file: 'CayleyHamilton.lean', top100: 49,
    milestone: '1858 · Cayley', fact: 'The characteristic polynomial of a 2×2 matrix uses only its trace and determinant.',
    scopeLabel: 'Dimension-two theorem', scope: 'Proves all four entries of A² − trace(A)A + det(A)I = 0 for arbitrary integer 2×2 matrices.',
    description: 'A matrix satisfies its own characteristic polynomial. Unpack that statement into four scalar identities.',
    body: `-- A = [a b; c d], trace = a+d, determinant = a*d-b*c.
theorem cayley_hamilton_2 (a b c d : Int) :
    (a*a+b*c) - (a+d)*a + (a*d-b*c) = 0 ∧
    (a*b+b*d) - (a+d)*b = 0 ∧
    (c*a+d*c) - (a+d)*c = 0 ∧
    (c*b+d*d) - (a+d)*d + (a*d-b*c) = 0 := by
  constructor
  · grind
  constructor
  · grind
  constructor <;> grind`,
    challenge: 'Use a=1, b=2, c=3, d=4 to compute the trace and determinant by hand.',
  },
  {
    id: 'wilson', title: 'Wilson’s theorem: small primes', file: 'Wilson.lean', top100: 51, category: 'Number theory',
    milestone: '1773 · Lagrange, as dated in the list', fact: 'For a prime p, the nonzero residues pair with their multiplicative inverses.',
    scopeLabel: 'Concrete cases', scope: 'Verifies the congruence at 5, 7, and 11, plus its failure at composite 8. No primality characterization for arbitrary numbers is proved.',
    description: 'Compute (p−1)! modulo p and recognize the residue −1.',
    body: `def factorial : Nat → Nat
  | 0 => 1
  | n+1 => (n+1) * factorial n

example : (factorial 4 + 1) % 5 = 0 := by decide
example : (factorial 6 + 1) % 7 = 0 := by decide
example : (factorial 10 + 1) % 11 = 0 := by decide
example : (factorial 7 + 1) % 8 ≠ 0 := by decide

#eval factorial 6 % 7`, expected: '6',
    challenge: 'Try p=13, then p=9. Why does pairing inverses behave differently?',
  },
  {
    id: 'subsets', title: 'Count subsets with bit strings', file: 'Subsets.lean', top100: 52, category: 'Counting & logic',
    milestone: 'First discovery date unknown', fact: 'A subset is encoded by one yes/no choice for each element.',
    scopeLabel: 'General counting identity', scope: 'Proves the length of the generated n-bit membership patterns is 2^n. The separate bijection to abstract finite sets is explained, not formalized.',
    description: 'Build every binary membership pattern and prove its count by induction.',
    body: `def patterns : Nat → List (List Bool)
  | 0 => [[]]
  | n+1 => (patterns n).map (true :: ·) ++ (patterns n).map (false :: ·)

theorem pattern_count (n : Nat) : (patterns n).length = 2^n := by
  induction n with
  | zero => rfl
  | succ n ih =>
    simp only [patterns, List.length_append, List.length_map, ih, Nat.pow_succ]
    omega

#eval (patterns 5).length`, expected: '32',
    challenge: 'Inspect patterns 3. Read each bit string as a subset of a three-element set.',
  },
  {
    id: 'bridges', title: 'Königsberg: count odd vertices', file: 'Bridges.lean', top100: 54, category: 'Counting & logic',
    milestone: '1736 · Euler', fact: 'The four land masses have degrees 3, 3, 3, and 5.',
    scopeLabel: 'Graph obstruction calculation', scope: 'Checks the four odd degrees and the failure of the necessary ≤2 condition for an Euler trail. The trail criterion itself is not proved here.',
    description: 'Compute the parity obstruction behind the seven-bridges puzzle.',
    body: `def oddVertices (degrees : List Nat) : Nat :=
  (degrees.filter fun d => d % 2 == 1).length

def konigsberg : List Nat := [3, 3, 3, 5]

example : oddVertices konigsberg = 4 := by decide
example : ¬ oddVertices konigsberg ≤ 2 := by decide

-- Each bridge is counted twice in the sum of vertex degrees.
example : konigsberg.foldl (· + ·) 0 = 2*7 := by decide

#eval oddVertices konigsberg`, expected: '4',
    challenge: 'Change the degree list to [1,2,2,1]. This passes the parity test; connectivity still matters.',
  },
  {
    id: 'heron', title: 'Heron’s formula: a 3–4–5 triangle', file: 'Heron.lean', top100: 57,
    milestone: 'c. 75 CE · Heron of Alexandria', fact: 'For sides 3,4,5 the semiperimeter is 6, and the area is also 6.',
    scopeLabel: 'Worked example', scope: 'Checks Heron’s squared-area expression for the 3–4–5 triangle. The geometric formula for arbitrary triangles is not derived.',
    description: 'Avoid floating-point square roots: verify the squared area with exact natural-number arithmetic.',
    body: `def heronSquared (a b c : Nat) : Nat :=
  let s := (a+b+c)/2
  s*(s-a)*(s-b)*(s-c)

example : heronSquared 3 4 5 = 6^2 := by decide
example : 3*4 = 2*6 := by decide

-- Nat division truncates. Restrict this helper to even perimeters
-- and valid triangles; it is not a general real-valued area function.
#eval heronSquared 3 4 5`, expected: '36',
    challenge: 'Check the 5–12–13 triangle: its area is 30.',
  },
  {
    id: 'combinations', title: 'Combinations & Pascal’s rule', file: 'Combinations.lean', top100: 58, category: 'Counting & logic',
    milestone: 'First discovery date unknown', fact: 'Partition choices according to whether they contain one distinguished element.',
    scopeLabel: 'Recurrence and calculations', scope: 'Implements Pascal’s recurrence and proves its defining step plus concrete counts. The factorial formula and set-counting interpretation are not formalized.',
    description: 'A recursive program mirrors the two cases in a combinatorial proof.',
    body: `def choose : Nat → Nat → Nat
  | _, 0 => 1
  | 0, _+1 => 0
  | n+1, k+1 => choose n k + choose n (k+1)

theorem pascal (n k : Nat) :
    choose (n+1) (k+1) = choose n k + choose n (k+1) := by
  rfl

example : choose 5 2 = 10 := by decide
#eval (List.range 7).map (choose 6)`, expected: '[1, 6, 15, 20, 15, 6, 1]',
    challenge: 'Prove choose n 0 = 1 for every n. Then inspect the row for n=8.',
  },
  {
    id: 'bezout', title: 'Bézout: a gcd certificate', file: 'Bezout.lean', top100: 60, category: 'Number theory',
    milestone: 'Date unspecified in the list · Bézout', fact: 'A linear combination supplies a compact certificate that a gcd is 1.',
    scopeLabel: 'Explicit certificate', scope: 'Proves the Bézout identity for 35 and 22 and checks their gcd. It does not construct coefficients for arbitrary inputs.',
    description: 'Negative coefficients let a linear combination of two positive integers equal 1. Supply a certificate Lean can check.',
    body: `-- 35*(-5) + 22*8 = 1.
theorem bezout_certificate :
    ∃ x y : Int, 35*x + 22*y = 1 := by
  exact ⟨-5, 8, by decide⟩

example : Nat.gcd 35 22 = 1 := by decide

#eval (35 * (-5) + 22 * 8 : Int)`, expected: '1',
    challenge: 'Find coefficients for 17 and 12. Can you use the Euclidean algorithm to produce them?',
  },
  {
    id: 'cantor', title: 'Cantor’s diagonal argument', file: 'Cantor.lean', top100: 63, category: 'Counting & logic',
    milestone: '1891 · Cantor', fact: 'The diagonal predicate disagrees with each proposed row at that row’s own index.',
    scopeLabel: 'General theorem', scope: 'Proves that no map from any type α onto its predicates α → Prop can be surjective. This is the predicate form of Cantor’s theorem.',
    description: 'An infinite theorem with a short proof: build a predicate that cannot appear in any proposed complete list.',
    body: `theorem cantor {α : Type} (f : α → α → Prop) :
    ¬ (∀ s : α → Prop, ∃ a, f a = s) := by
  intro onto
  -- Ask for the row representing “not on your own diagonal”.
  obtain ⟨a, ha⟩ := onto (fun x => ¬ f x x)
  have h := congrArg (fun s => s a) ha
  -- h says f a a is equivalent to its own negation.
  have hn : ¬ f a a := fun hp => (h.mp hp) hp
  exact hn (h.mpr hn)`,
    concepts: [{ token: 'α → Prop', explanation: 'A predicate on α represents a subset: it states which elements belong.' }, { token: 'congrArg', explanation: 'Apply the same function to both sides of an equality.' }, { token: '¬ P', explanation: 'Negation is a function from a proof of P to False.' }],
    challenge: 'Read the final two lines as a paper proof. Where exactly is the contradiction?',
  },
  {
    id: 'geometric-series', title: 'A finite geometric series', file: 'GeometricSeries.lean', top100: 66,
    milestone: 'c. 260 BCE · Archimedes tradition; date approximate', fact: 'Multiplying the sum by r shifts every term one place, leaving two endpoints after subtraction.',
    scopeLabel: 'General finite identity', scope: 'Proves (r−1)Σᵢ₌₀ⁿ⁻¹ rⁱ = rⁿ−1 for all integer r and natural n. It includes r=1 without division; no infinite limit is asserted.',
    description: 'Prove a familiar summation formula with recursion and induction.',
    body: `def geometricSum (r : Int) : Nat → Int
  | 0 => 0
  | n+1 => geometricSum r n + r^n

theorem geometric_formula (r : Int) (n : Nat) :
    (r-1)*geometricSum r n = r^n-1 := by
  induction n with
  | zero => simp only [geometricSum, Int.pow_zero]; grind
  | succ n ih => simp only [geometricSum, Int.pow_succ]; grind

#eval geometricSum 2 10`, expected: '1023',
    challenge: 'Evaluate the sum at r=1 and r=−1. Why is avoiding division convenient?',
  },
  {
    id: 'arithmetic-series', title: 'Add 1 through n', file: 'ArithmeticSeries.lean', top100: 68,
    milestone: 'c. 1700 BCE · Babylonian arithmetic', fact: 'Writing twice the sum avoids division and makes the induction step a polynomial identity.',
    scopeLabel: 'General theorem', scope: 'Proves 2(1+⋯+n)=n(n+1) for every natural n.',
    description: 'A small recursive function and an induction proof of the triangular-number formula.',
    body: `def triangleSum : Nat → Nat
  | 0 => 0
  | n+1 => triangleSum n + (n+1)

theorem sum_formula (n : Nat) :
    2 * triangleSum n = n*(n+1) := by
  induction n with
  | zero => rfl
  | succ n ih => simp only [triangleSum]; grind

#eval triangleSum 100`, expected: '5050',
    challenge: 'Change the function to sum odd numbers. Can you prove the result is n²?',
  },
  {
    id: 'euclidean-gcd', title: 'Euclid’s gcd algorithm', file: 'EuclideanGCD.lean', top100: 69, category: 'Number theory',
    milestone: 'c. 300 BCE · Euclid', fact: 'The gcd of 1071 and 462 is 21; Euclidean division quickly reduces the inputs.',
    scopeLabel: 'General gcd properties', scope: 'Uses Lean core’s proved gcd lemmas to establish divisibility of both inputs. The library supplies the algorithm’s correctness proof.',
    description: 'Run an ancient algorithm and reuse its verified properties in your own theorem.',
    body: `theorem gcd_divides_both (a b : Nat) :
    Nat.gcd a b ∣ a ∧ Nat.gcd a b ∣ b := by
  constructor
  · exact Nat.gcd_dvd_left a b
  · exact Nat.gcd_dvd_right a b

example : Nat.gcd 1071 462 = 21 := by decide

def main : IO Unit := do
  IO.println s!"gcd(1071, 462) = {Nat.gcd 1071 462}"
  IO.println s!"gcd(35, 22) = {Nat.gcd 35 22}"`, mode: 'program', expected: 'gcd(1071, 462) = 21\ngcd(35, 22) = 1',
    challenge: 'Find and evaluate two inputs with gcd 12. Can you prove 12 divides both?',
  },
  {
    id: 'perfect-numbers', title: 'Perfect numbers: 6 and 28', file: 'PerfectNumbers.lean', top100: 70, category: 'Number theory',
    milestone: 'c. 300 BCE · Euclid’s construction', fact: 'The proper divisors of 6 are 1, 2, and 3, which add back to 6.',
    scopeLabel: 'Concrete cases', scope: 'Checks the defining divisor-sum property at 6 and 28. Euclid’s general construction and Euler’s converse are not proved.',
    description: 'Compute divisors, sum them, and check the first two perfect numbers.',
    body: `def properDivisors (n : Nat) : List Nat :=
  (List.range n).filter fun d => d > 0 && n % d == 0

def divisorSum (n : Nat) := (properDivisors n).foldl (· + ·) 0

example : divisorSum 6 = 6 := by decide
example : divisorSum 28 = 28 := by decide

#eval properDivisors 28
#eval divisorSum 28`, expected: '[1, 2, 4, 7, 14]\n28',
    challenge: 'Evaluate divisorSum 496. Compare the result with the input.',
  },
  {
    id: 'induction-principle', title: 'The induction principle', file: 'InductionPrinciple.lean', top100: 74, category: 'Counting & logic',
    milestone: '1321 · Levi ben Gerson milestone', fact: 'The step proves an implication for every n, rather than checking a long finite list.',
    scopeLabel: 'General theorem', scope: 'Proves natural-number induction for every predicate P using Lean’s inductive eliminator.',
    description: 'State the principle itself as a theorem, with a base case and a step supplied as arguments.',
    body: `theorem induction_principle (P : Nat → Prop)
    (base : P 0) (step : ∀ n, P n → P (n+1)) :
    ∀ n, P n := by
  intro n
  induction n with
  | zero => exact base
  | succ n ih => exact step n ih

-- A simple application: adding zero preserves n.
example : ∀ n : Nat, n+0 = n := by
  apply induction_principle
  · rfl
  · intro n _
    rfl`,
    challenge: 'Identify the type of ih in the successor case. Why is it exactly what step needs?',
  },
  {
    id: 'sum-squares', title: 'The sum of squares', file: 'SumOfSquares.lean', top100: 77,
    milestone: '1713 · Bernoulli’s power-sum milestone', fact: 'Multiplying by 6 clears the denominator of the familiar sum-of-squares formula.',
    scopeLabel: 'General theorem at k=2', scope: 'Proves the square-sum formula for every n. This is one power-sum theorem, not the formula for arbitrary k.',
    description: 'Repeat the induction pattern with a slightly richer polynomial.',
    body: `def squareSum : Nat → Nat
  | 0 => 0
  | n+1 => squareSum n + (n+1)^2

theorem square_sum_formula (n : Nat) :
    6*squareSum n = n*(n+1)*(2*n+1) := by
  induction n with
  | zero => rfl
  | succ n ih => simp only [squareSum]; grind

#eval squareSum 10`, expected: '385',
    challenge: 'Define a cube sum and conjecture a relationship with triangleSum squared.',
  },
  {
    id: 'cauchy-schwarz', title: 'Cauchy–Schwarz in two dimensions', file: 'CauchySchwarz.lean', top100: 78,
    milestone: '19th century · Cauchy and Schwarz', fact: 'In two dimensions, the gap is the square of the determinant ad−bc.',
    scopeLabel: 'Dimension-two theorem', scope: 'Proves (ac+bd)² ≤ (a²+b²)(c²+d²) for arbitrary integers a,b,c,d. General inner-product spaces are outside this example.',
    description: 'A famous inequality becomes a nonnegative square after one algebraic identity.',
    body: `theorem cauchy_schwarz_2 (a b c d : Int) :
    (a*c+b*d)^2 ≤ (a*a+b*b)*(c*c+d*d) := by
  have square_nonnegative := Int.sq_nonneg (a*d-b*c)
  grind`,
    challenge: 'Try proportional vectors (a,b)=(2,4) and (c,d)=(3,6). Why does equality hold?',
  },
  {
    id: 'divisibility-three', title: 'Why the digit test for 3 works', file: 'DivisibilityByThree.lean', top100: 85, category: 'Number theory',
    milestone: 'First discovery date unknown', fact: 'The decimal base 10 leaves remainder 1 modulo 3.',
    scopeLabel: 'General reduction lemma', scope: 'Proves that replacing n with its last digit plus the remaining prefix preserves its residue modulo 3. Iteration gives the digit-sum rule.',
    description: 'Prove the single step behind a familiar school arithmetic trick.',
    body: `theorem digit_step (n : Nat) :
    n % 3 = (n / 10 + n % 10) % 3 := by
  omega

-- Apply the step to 123: replace it with 12+3.
example : 123 % 3 = (12+3) % 3 := by decide
-- Repeat until the result is small.
example : (12+3) % 3 = (1+2+3) % 3 := by decide`,
    concepts: [{ token: '%', explanation: 'Remainder after division. n % 3 is 0, 1, or 2.' }, { token: '/', explanation: 'Division on Nat is integer division; n / 10 drops the final decimal digit.' }, { token: 'omega', explanation: 'A core tactic for linear integer/natural arithmetic, including division and remainders by constants.' }],
    challenge: 'Replace 3 with 9. Does the same theorem hold? What happens for 7?',
  },
  {
    id: 'factor-remainder', title: 'The factor & remainder identity', file: 'FactorRemainder.lean', top100: 89,
    milestone: 'First discovery date unknown', fact: 'Subtracting p(r) from p(x) makes x−r appear as a factor.',
    scopeLabel: 'General quadratic identity', scope: 'Proves the remainder identity for an arbitrary integer quadratic and derives factorization when r is a root. Arbitrary-degree polynomials are not modeled.',
    description: 'Express the factor theorem directly, without importing a polynomial library.',
    body: `def polynomial (a b c x : Int) := a*x^2+b*x+c

theorem remainder_identity (a b c x r : Int) :
    polynomial a b c x - polynomial a b c r =
      (x-r)*(a*(x+r)+b) := by
  unfold polynomial
  grind

theorem root_factor (a b c x r : Int)
    (root : polynomial a b c r = 0) :
    polynomial a b c x = (x-r)*(a*(x+r)+b) := by
  have h := remainder_identity a b c x r
  omega`,
    challenge: 'Use the identity for x²−5x+6 at r=2. What is the remaining factor?',
  },
  {
    id: 'cramer', title: 'Cramer’s rule in 2 × 2', file: 'CramersRule.lean', top100: 97,
    milestone: '1750 · Cramer', fact: 'Eliminating y and eliminating x produces the two determinant numerators.',
    scopeLabel: 'General elimination identities', scope: 'Proves the division-free equations det(A)x=ed−bf and det(A)y=af−ec for any integer solution. Division and existence of a solution are not asserted.',
    description: 'Derive the numerators in the formula for solving two simultaneous linear equations.',
    body: `theorem cramer_numerators (a b c d e f x y : Int)
    (first : a*x+b*y = e) (second : c*x+d*y = f) :
    (a*d-b*c)*x = e*d-b*f ∧
    (a*d-b*c)*y = a*f-e*c := by
  constructor <;> grind

-- 2x+y=5 and x-y=1 have the solution x=2, y=1.
example : 2*(2 : Int)+1=5 ∧ 2-1=1 := by decide`,
    challenge: 'Why must the determinant be nonzero before dividing to solve for x and y?',
  },
  {
    id: 'quadratic', title: 'The quadratic equation', file: 'Quadratic.lean',
    milestone: 'c. 1700 BCE · Babylonian quadratic problems',
    source: 'https://mathshistory.st-andrews.ac.uk/HistTopics/Quadratic_etc_equations/', sourceTitle: 'History of quadratic equations',
    fact: 'Completing the square explains why the discriminant b²−4ac appears.',
    scopeLabel: 'General identity & root criterion', scope: 'Proves the completed-square identity and its equivalence to being a root when a≠0, over integers. The real square-root formula needs a larger number library.',
    description: 'Discover the algebra behind the quadratic formula, then prove exactly which integers solve x²−5x+6=0.',
    body: `theorem completing_square (a b c x : Int) :
    (2*a*x+b)^2 - (b^2-4*a*c) = 4*a*(a*x^2+b*x+c) := by
  grind

theorem quadratic_criterion (a b c x : Int) (ha : a ≠ 0) :
    a*x^2+b*x+c = 0 ↔ (2*a*x+b)^2 = b^2-4*a*c := by
  constructor
  · intro h
    grind
  · intro h
    have product : (4*a)*(a*x^2+b*x+c) = 0 := by grind
    rcases Int.mul_eq_zero.mp product with hz | hz
    · have : a = 0 := by omega
      exact False.elim (ha this)
    · exact hz

theorem roots (x : Int) : x^2-5*x+6=0 ↔ x=2 ∨ x=3 := by
  constructor
  · intro h
    have product : (x-2)*(x-3) = 0 := by grind
    rcases Int.mul_eq_zero.mp product with h2 | h3
    · left; omega
    · right; omega
  · intro h
    rcases h with h2 | h3 <;> grind`,
    challenge: 'Change the last equation to x²−7x+12=0 and identify its two roots.',
  },
  {
    id: 'rings', title: 'A ring with zero divisors', file: 'Rings.lean', category: 'Algebra & fields',
    milestone: 'Modern algebra · finite residue rings', fact: 'Modulo 6, the nonzero elements 2 and 3 multiply to zero.',
    scopeLabel: 'All ring laws at modulus 6', scope: 'Checks commutative ring laws on every element of Fin 6, and exhibits a zero divisor. These are concrete laws, not a Mathlib typeclass instance.',
    description: 'Addition and multiplication can obey ring laws even when division by a nonzero element is impossible.',
    body: `abbrev R := Fin 6

-- Exhaustive finite proofs are checked by Lean's kernel.
example : ∀ a b c : R, (a+b)+c = a+(b+c) := by decide
example : ∀ a b : R, a+b = b+a := by decide
example : ∀ a : R, a+0 = a := by decide
example : ∀ a : R, a+(-a) = 0 := by decide
example : ∀ a b c : R, (a*b)*c = a*(b*c) := by decide
example : ∀ a b : R, a*b = b*a := by decide
example : ∀ a : R, a*1 = a := by decide
example : ∀ a b c : R, a*(b+c) = a*b+a*c := by decide
example : (0 : R) ≠ 1 := by decide

-- A field would not allow this.
example : (2 : R) ≠ 0 ∧ (3 : R) ≠ 0 ∧ (2 : R)*3 = 0 := by decide
#eval (2 : R)*3`, expected: '0',
    source: 'https://lean-lang.org/doc/api/Init/Data/Fin/Basic.html', sourceTitle: 'Lean’s finite residue arithmetic',
    challenge: 'Change the modulus to 5. Which last claim stops being true?',
  },
  {
    id: 'gf5', title: 'GF(5): a prime field', file: 'GF5.lean', category: 'Algebra & fields',
    milestone: 'Finite-field algebra · prime characteristic', fact: 'The multiplicative inverse of 2 is 3 in GF(5), because 2×3 leaves remainder 1.',
    scopeLabel: 'All field laws on five elements', scope: 'Verifies the commutative ring laws and an inverse for each nonzero Fin 5 element. No general prime-modulus theorem or Mathlib Field instance is used.',
    description: 'Prove that arithmetic modulo 5 forms a field by checking every possible input.',
    body: `abbrev F := Fin 5

example : ∀ a b c : F, (a+b)+c = a+(b+c) := by decide
example : ∀ a b : F, a+b = b+a := by decide
example : ∀ a : F, a+0 = a ∧ a+(-a) = 0 := by decide
example : ∀ a b c : F, (a*b)*c = a*(b*c) := by decide
example : ∀ a b : F, a*b = b*a := by decide
example : ∀ a : F, a*1 = a := by decide
example : ∀ a b c : F, a*(b+c) = a*b+a*c := by decide
example : (0 : F) ≠ 1 := by decide

-- This is the extra property that fails modulo 6.
theorem nonzero_inverse : ∀ a : F, a ≠ 0 → ∃ b : F, a*b = 1 := by
  decide

#eval (2 : F)*3`, expected: '1',
    source: 'https://lean-lang.org/doc/api/Init/Data/Fin/Basic.html', sourceTitle: 'Lean’s finite residue arithmetic',
    challenge: 'Try Fin 7. Then try Fin 6 and see the inverse theorem fail.',
  },
  {
    id: 'gf4', title: 'GF(4): build an extension field', file: 'GF4.lean', category: 'Algebra & fields',
    milestone: '2001 · AES standard: a larger binary-field application', fact: 'Four elements need two bits, but GF(4) is not arithmetic modulo 4. Here u²=u+1.',
    scopeLabel: 'All field laws on four elements', scope: 'Defines GF(2)[u]/(u²+u+1) as two binary coefficients and checks all field laws. This is a small teaching field; AES instead uses GF(256).',
    description: 'Construct a Galois field yourself, then let Lean exhaustively verify its addition, multiplication, and inverses.',
    body: `-- (a,b) represents a+b*u; coefficients live modulo 2.
abbrev F4 := Fin 2 × Fin 2

-- Teach decide to enumerate both binary coefficients.
instance (P : F4 → Prop) [DecidablePred P] : Decidable (∀ x, P x) :=
  decidable_of_iff (∀ a b : Fin 2, P (a,b))
    ⟨fun h x => h x.1 x.2, fun h a b => h (a,b)⟩
instance (P : F4 → Prop) [DecidablePred P] : Decidable (∃ x, P x) :=
  decidable_of_iff (∃ a b : Fin 2, P (a,b))
    ⟨fun ⟨a,b,h⟩ => ⟨(a,b),h⟩, fun ⟨(a,b),h⟩ => ⟨a,b,h⟩⟩

def add (x y : F4) : F4 := (x.1+y.1, x.2+y.2)
-- Reduce u² to u+1 after multiplying the polynomials.
def mul (x y : F4) : F4 :=
  (x.1*y.1+x.2*y.2, x.1*y.2+x.2*y.1+x.2*y.2)

def zero : F4 := (0,0)
def one : F4 := (1,0)
def u : F4 := (0,1)

example : ∀ a b c : F4, add (add a b) c = add a (add b c) := by decide
example : ∀ a b : F4, add a b = add b a := by decide
example : ∀ a : F4, add a zero = a ∧ add a a = zero := by decide
example : ∀ a b c : F4, mul (mul a b) c = mul a (mul b c) := by decide
example : ∀ a b : F4, mul a b = mul b a := by decide
example : ∀ a : F4, mul a one = a := by decide
example : ∀ a b c : F4, mul a (add b c) = add (mul a b) (mul a c) := by decide
example : zero ≠ one := by decide
example : ∀ a : F4, a ≠ zero → ∃ b : F4, mul a b = one := by decide

example : mul u u = add u one := by decide
#eval mul u (add u one)`, expected: '(1, 0)',
    source: 'https://csrc.nist.gov/pubs/fips/197/final', sourceTitle: 'NIST: AES and binary finite fields',
    challenge: 'Remove the x.2*y.2 contribution from the second coefficient. Which field laws break?',
  },
  {
    id: 'diffie-hellman', title: 'Diffie–Hellman: a shared secret', file: 'DiffieHellman.lean', category: 'Cryptography',
    milestone: '1976 · Diffie and Hellman', fact: 'Both participants arrive at g^(ab) even though they exchange only g^a and g^b.',
    scopeLabel: 'Toy protocol execution', scope: 'Checks one exchange modulo 23 with known example secrets. It demonstrates agreement, not cryptographic security. Do not use these parameters for protection.',
    description: 'Run both sides of a key exchange and prove they arrive at the same residue.',
    body: `def publicKey (secret : Nat) : Fin 23 := (5 : Fin 23)^secret

def aliceSecret := 6
def bobSecret := 15

def aliceShared := (publicKey bobSecret)^aliceSecret
def bobShared := (publicKey aliceSecret)^bobSecret

theorem agreement : aliceShared = bobShared := by decide

def main : IO Unit := do
  IO.println s!"Alice sends {publicKey aliceSecret}"
  IO.println s!"Bob sends {publicKey bobSecret}"
  IO.println s!"Alice gets {aliceShared}"
  IO.println s!"Bob gets {bobShared}"`, mode: 'program', expected: 'Alice sends 8\nBob sends 19\nAlice gets 2\nBob gets 2',
    source: 'https://www-ee.stanford.edu/~hellman/publications/24.pdf', sourceTitle: 'New Directions in Cryptography (1976)',
    challenge: 'Change the two secrets and rerun. With such tiny numbers, can you recover a secret by exhaustive search?',
  },
  {
    id: 'rsa', title: 'RSA: prove a tiny round trip', file: 'RSA.lean', category: 'Cryptography',
    milestone: '1978 · Rivest, Shamir, Adleman publication', fact: 'With p=3 and q=11, φ(33)=20 and 3×7 is 1 modulo 20.',
    scopeLabel: 'All messages in a toy RSA system', scope: 'Proves decrypt(encrypt(m))=m for all 33 residues with e=3,d=7. This is tiny textbook RSA without padding and is not secure encryption.',
    description: 'Use a finite type to prove a complete round trip for every message in a miniature RSA system.',
    body: `abbrev Message := Fin 33

def encrypt (m : Message) : Message := m^3
def decrypt (c : Message) : Message := c^7

-- This checks every possible message, not just the printed one.
theorem rsa_round_trip : ∀ m : Message, decrypt (encrypt m) = m := by
  decide

def main : IO Unit := do
  let message : Message := 4
  IO.println s!"Message: {message}"
  IO.println s!"Encrypted: {encrypt message}"
  IO.println s!"Decrypted: {decrypt (encrypt message)}"`, mode: 'program', expected: 'Message: 4\nEncrypted: 31\nDecrypted: 4',
    source: 'https://web.mit.edu/6.857/OldStuff/Fall03/ref/rivest78method.pdf', sourceTitle: 'The RSA paper (1978)',
    challenge: 'Replace the decryption exponent 7 with 5. Can Lean still prove the round trip for all messages?',
  },
];

export const mathExamples: Example[] = entries.map(entry => {
  const source = entry.source ?? listSource;
  const sourceTitle = entry.sourceTitle ?? 'Historical Top 100 list (reproduced by Lurch)';
  const heading = entry.top100 ? `Top 100 #${entry.top100}: ${entry.title}` : entry.title;
  return {
    id: entry.id, title: entry.title, file: entry.file,
    category: entry.category ?? 'Classic mathematics', mode: entry.mode ?? 'check',
    description: entry.description,
    // Keep history and exact scope in downloaded and shared source as well as the guide.
    code: `-- ${heading}\n-- History: ${entry.milestone}.\n-- Dates identify historical milestones, not the date of this Lean proof.\n-- Fact: ${entry.fact}\n-- Scope: ${entry.scope}\n-- Source: ${source}\n\n${entry.body}\n`,
    expected: entry.expected ?? 'File checked successfully.', challenge: entry.challenge,
    concepts: entry.concepts ?? [
      { token: 'theorem / example', explanation: 'A named theorem or anonymous example states exactly the claim Lean must check. Read its inputs and assumptions to see the scope.' },
      { token: entry.body.includes('grind') ? 'grind' : 'decide', explanation: entry.body.includes('grind') ? 'Combines logical reasoning and polynomial normalization to construct a proof term that Lean checks.' : 'Builds a proof using a decision procedure. Quantifying over Fin n checks every one of its finitely many values.' },
      { token: entry.body.includes('Int') ? 'Int' : 'Nat / Fin n', explanation: entry.body.includes('Int') ? 'Exact integers, including negatives. Unlike Nat subtraction, integer subtraction does not truncate at zero.' : 'Nat is an arbitrary-size natural number. Fin n contains exactly the natural numbers less than n, with arithmetic modulo n.' },
    ],
    history: { top100: entry.top100, milestone: entry.milestone, fact: entry.fact, scope: entry.scope, scopeLabel: entry.scopeLabel, source, sourceTitle },
  };
});
