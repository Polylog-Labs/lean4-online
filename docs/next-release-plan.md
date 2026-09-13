# Verification and advanced mathematics: implementation plan

Status: proposed next work. The collection now contains 60 examples, 17 lessons, and 85 syntax entries, including early Curry–Howard lessons, hashing, SHA-256, simp, sorry, and efficiency. The verification projects below are not yet implemented.

## Release constraints

- Keep the current core-only Lean WASM runtime. No Mathlib download in this release, following the user's size constraint.
- Keep every example advertised as browser-runnable executable in the pinned browser compiler. Label an intentionally failing example as such and test its diagnostic. Preserve the distinction between a warning, a failed check, and a completed proof.
- Keep the existing Learn introduction, compact desktop IDE, mobile Code/Output/Guide views, dark default, local files, and saved progress.
- Add each project as a self-contained file. Reuse TypeScript source templates when examples share an interpreter or data model, while exporting complete .lean files.
- Do not add a proof server, database, R2 account, or automatic large-library download.
- Existing content already covers some proposed topics. Link to or extend it instead of duplicating lessons and resetting their IDs.

## Browser compatibility prerequisite

Full Safari/iPhone compiler compatibility remains unresolved. The current WebKit audit found stack overflows in existing and new examples, including Welcome, rings, and SHA-256. The editor and basic execution work, and the error UI now points to local execution. See [the compatibility report](browser-compatibility.md). Resolve this runtime issue before describing the complete collection as supported on mobile Safari.

## First implementation group: verification

Add a Verification category, positioned after Proofs, and a corresponding Learn track. Build these three projects first, in this order:

1. **OptimizerCorrect.lean — optimize without changing meaning.** Define an expression AST, an interpreter, and a recursive optimizer for addition by zero and multiplication by one. Prove `eval (optimize e) = eval e` for every expression by structural induction. Print the original and optimized expressions and their results. Exercise: add another valid rewrite, then restore the proof. Acceptance: the general theorem is checked; an intentionally incorrect rewrite fails its proof.
2. **TransferInvariant.lean — transfers preserve the total.** Use natural-number balances and return `none` for insufficient funds. Prove conservation after every successful transfer and prove that success implies sufficient funds. Run successful and rejected transfers. Explain the exact model: two accounts, no fees, no overflow, and no real payment integration. Exercise: repair a transition that credits too much. Acceptance: insufficient funds are rejected, total conservation is quantified over arbitrary states and amounts, and the faulty transition is rejected by its specification.
3. **CompilerCorrect.lean — compile arithmetic expressions correctly.** Reuse the conceptual AST but keep the file independently runnable. Add a stack-machine instruction type, interpreter, and compiler. Prove the stronger continuation theorem `run (compile e ++ code) stack = run code (eval e :: stack)` before deriving the empty-stack result. This avoids an induction hypothesis too weak to compose subexpressions. Exercise: add subtraction, specify operand order, and extend all cases. Acceptance: generated code cannot underflow on the modeled inputs, results agree for every AST, and a reversed subtraction implementation fails.

Each guide should explain the specification before the proof, show an actual run, identify assumptions and scope, and link to the corresponding lesson. Correctness theorems must use neither `sorry` nor custom axioms.

## Second group: specifications, types, and invariants

- **Testing versus proving:** evaluate double reversal on examples, then prove it for every list. Use this as the first Verification lesson.
- **Safe indexing:** contrast `Option` lookup with a length-indexed vector and Lean's existing `Fin n`. Do not redefine core `Fin`. Construct an index with its bound proof and return a value directly; include a rejected invalid-index example. Clarify that the guarantee assumes completed proofs and safe definitions.
- **Sorting:** implement insertion sort; prove both sortedness and permutation/content preservation. Show that `badSort := []` meets sortedness alone, so the specification needs both properties. Preserve multiplicities, not merely set membership.
- **Protocol invariant:** model transitions and a reachable-state relation. Prove the invariant for the initial state and its preservation by every accepted transition. Derive that paid implies authorized for every reachable state. If teaching the historical claim “approval happened earlier,” model execution traces explicitly; a Boolean flag alone does not express history.
- **When Lean says no:** add an example with an expected failure, source-position diagnostics, and a repair exercise. Extend content metadata to declare the expected error; do not weaken the success requirement for other examples. Keep intentional failure distinct from the existing sorry warning example.

## Third group: Types & abstraction

- **One interface, several types:** define a small namespaced algebraic interface with laws, avoiding collision with library names. Prove one generic theorem, then instantiate it for natural-number addition and list concatenation. Existing TypeClasses.lean remains the introductory interface example.
- **A tiny DSL:** start with an inductive command language and interpreter. Prove a transition invariant over every command list. Add parser macros only after a minimal `syntax`/`macro_rules` example has been verified in the current slim WASM build; do not assume arbitrary metaprogramming imports work.
- **Proof by computation:** show a decidable universal proposition on a genuinely finite domain and explain how `decide` creates kernel-checked evidence. Bound the example so it runs on mobile without raising limits enough to overflow the WASM stack.
- **Logic puzzle:** encode all clues and prove both existence and uniqueness of a solution. The cookie clues supplied in the request identify **Bob**, not Carol: Alice and Carol tell the truth when Bob is guilty. Either retain the clues and prove Bob is guilty, or change the clues deliberately. Do not prove a conclusion from inconsistent assumptions.
- Extend the current explicit Curry–Howard example with conjunctions, disjunctions, and witnesses, keeping the first two lessons short.

## Fourth group: cryptography and coding theory

1. **Merkle proofs:** represent the leaf position, sibling direction, tree, root calculation, proof generation, and verification. Prove generated paths reconstruct the root for every modeled tree/leaf. Start with an abstract hash or clearly identified toy hash. State that structural correctness does not establish collision resistance. Later connect the runnable demo to the existing SHA-256 implementation, with unambiguous serialization and distinct leaf/internal-node tags.
2. **Reed–Solomon encoding:** use `Fin 17`, messages of exactly three coefficients, and five fixed distinct evaluation points. Compute the supplied polynomial `3 + 2x + x²`. Explain the field arithmetic and degree bound; do not call ordinary integer remainder a field without accounting for its operations and laws.
3. **Interpolation:** implement recovery from three fixed distinct points and prove the round trip for every three-coefficient message. Use algebraic lemmas or bounded arithmetic reasoning rather than an enormous kernel enumeration. Add a separate example of detecting one changed symbol only after proving the necessary distance/detection property. Do not claim error correction from interpolation alone.

This group is separate from the first three verification projects so that each completed project can ship with its own checks.

## Advanced mathematics: zeta regularization

The intended presentation is two distinct claims:

- The ordinary real series `1 + 2 + 3 + …` is not summable.
- The analytically continued Riemann zeta function satisfies `ζ(-1) = -1/12`; this is the zeta-regularized assignment.

Use “positive integers,” not “all integers.” Do not display `∑' n, (n + 1)` as a regularized sum. In Mathlib, `tsum` is a totalized operation: outside the summable case it takes a default value, so a bare `tsum` equality is not evidence of convergence. Use `HasSum`/`Summable` for claims about ordinary summation.

The referenced Mathlib declarations exist: `riemannZeta_neg_nat_eq_bernoulli` and `bernoulli_two`. The former is also present at the upstream browser project's Mathlib pin `de3a9cf33016bbb6d15880d7680643f7ca2d25ba`. The exact proposed proof script still requires compilation at a pinned version; checking the source declaration is not the same as checking the example.

Implementation for this release:

1. Create a **Run locally with Mathlib** article and downloadable Lean file, with an exact Lean/Mathlib lock and reproducible Lake instructions.
2. Compile the zeta value proof and the ordinary non-summability proof in native Lean CI. Use the narrow zeta import and explicit tactic imports as required; a three-line application can still have a large dependency graph.
3. Explain the Bernoulli calculation separately from the analytic continuation theorem it relies on. Do not replace the zeta theorem with a definition that simply returns `-1/12`.
4. Keep this article out of the browser-runnable collection and distinguish its local-only action from Run in browser.
5. Treat Ramanujan summation as a separate future formalization with an explicitly stated convention. Do not relabel a zeta-value theorem as a theorem about Ramanujan summation.

### Mathlib size decision

**No browser Mathlib bundle for this release.** This is based on the user's rejection of a roughly 200 MB additional download.

Verified upstream evidence: a different Mathlib-based browser course documents a 218 MiB compressed Homeomorphisms layer and 330 MiB across its original six layers. These numbers are not a zeta size estimate and exclude this site's 45.9 MB core runtime download. The exact zeta dependency subset is unmeasured.

If browser support is reconsidered later, its feasibility work must first pin the exact Lean commit and 32-bit build format, build the zeta import dependency closure plus executable tactic IR, and measure compressed bytes, expanded size, peak browser memory, cold import time, warm checking, and Safari behavior. Desktop 64-bit `.olean` caches cannot simply be copied into this WASM runtime. Load any approved package only on demand, with progress and cache reuse. Resolve public asset hosting separately; a new public repository still needs explicit authorization.

## Agent and search documentation

Implemented in the current update:

- `/llms.txt`, `/agent.txt`, and `/agents.txt`: capabilities, restrictions, site controls, sharing format, and a short Lean introduction.
- `/llms-full.txt`: generated from the same examples, lesson text, and syntax entries as the app.
- Static `/examples`, `/examples/[id]`, `/learn`, and `/learn/[id]` pages with source, explanations, hints, solutions, canonical URLs, and links into the editor.
- `robots.txt` and a sitemap for the public reading pages.
- No editor or compiler download on a reading page. Documentation is generated from content rather than maintained as a duplicate curriculum.

These files improve access and discovery; they do not guarantee a ranking or require a crawler to use the content. Repository AGENTS.md remains a developer-instruction file and is separate from public site documentation.

## Curriculum order

Keep the early two lessons on `2 + 2 = 4` and Curry–Howard. Continue with values/functions/IO, cases/recursion, rewriting/simp, natural-number and list induction, specifications, dependent types, optimizer verification, typeclasses, finite decidability, state invariants, and the compiler capstone. Hashing, efficiency, Merkle proofs, and coding theory form further tracks. Preserve existing lesson IDs and progress.

## Definition of done

- Every advertised browser example runs in the pinned WASM compiler, including its expected output and completion/error state.
- New verification projects have general correctness statements, checked solutions, rejected unfinished exercises, and tests for deliberately faulty implementations.
- Native programs run with `lean --run`; the local Mathlib article has a separately pinned native check.
- All guides use standard technical English and describe precisely what is proved, assumed, computed, or only illustrated.
- Mobile highlighting, input, file management, diagnostics, keyboard layout, readable guides, and program execution pass WebKit checks. Physical-device review remains part of release review.
- New examples and lessons appear in the reading pages, sitemap, and generated agent text.
- Production build, TypeScript, lint, unit tests, Lean checks, Chromium, and WebKit pass in CI. Changes are pushed to the already-authorized main branch.

## Sources checked

- [Mathlib zeta values](https://leanprover-community.github.io/mathlib4_docs/Mathlib/NumberTheory/LSeries/HurwitzZetaValues.html)
- [Mathlib infinite-sum definitions](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Algebra/InfiniteSum/Defs.html)
- [Mathlib Bernoulli numbers](https://leanprover-community.github.io/mathlib4_docs/Mathlib/NumberTheory/Bernoulli.html)
- [Pinned zeta theorem source](https://github.com/leanprover-community/mathlib4/blob/de3a9cf33016bbb6d15880d7680643f7ca2d25ba/Mathlib/NumberTheory/LSeries/HurwitzZetaValues.lean)
- [Browser artifact requirements and measured layer sizes](https://github.com/cauli/lean4-wasm-in-browser/blob/main/deploy/DEPLOY.md)
- [Browser Mathlib build workflow](https://github.com/cauli/lean4/blob/reinstate-wasm/.github/workflows/build-browser-mathlib-manifold-closure.yml)
- [Induction and recursion](https://lean-lang.org/theorem_proving_in_lean4/Induction-and-Recursion/)
- [Programming, proving, and performance](https://lean-lang.org/functional_programming_in_lean/Programming___-Proving___-and-Performance/)
