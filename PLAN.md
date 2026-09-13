# Lean Lab — implementation plan

Build a TypeScript learning environment that puts programming and proof checking in the same online editor. The audience is developers who are new to Lean. The initial workspace should open directly into an editable, runnable Welcome.lean program.

## Product

- Remix-inspired workspace: activity rail, example explorer, file tabs, editor, contextual guide, and output panel.
- Programs, proofs, and guided lessons share the same editor and actual Lean runtime.
- Separate **Run program** and **Check file** actions. Teach `main : IO Unit`, `#eval`, and the difference between evaluating code in the browser and building a native executable with Lake.
- A searchable example library covering expressions, functions, recursion, lists, structures, pattern matching, IO, and introductory proofs.
- A learning path with concise explanations, editable exercises, hints, and locally saved progress.
- A searchable syntax reference covering declarations, types, functions, notation, effects, and tactics.
- Light, dark, and system appearance; accessible keyboard controls; responsive panels; local autosave; source download and shareable snippets.

## Technical approach

- React and TypeScript with Monaco for the editor. Use a standard Next.js production build for the requested Vercel deployment.
- Run real Lean 4 WebAssembly locally in the browser, isolated from the UI. Validate the available runtime before committing to its adapter.
- Use structured diagnostics when available. Do not present generated or canned output as the result of execution.
- Start with bundled core Lean examples. Full Mathlib, arbitrary package installation, live language-server completion, and native binary compilation are later milestones.
- Cache versioned runtime artifacts locally. Show explicit download, initialization, running, success, failure, and cancellation states.
- Configure cross-origin isolation headers for threaded WASM. Keep large runtime assets out of serverless function responses.
- Store preferences, drafts, and progress only on the user's device; no login or database for the first version.

## Build sequence and acceptance criteria

1. **Validate the runtime.** Execute an arithmetic expression, a `main` program, a valid proof, and an invalid proof. Verify that errors and actual output are reported. Document runtime size, startup limitations, and the supported execution model.
2. **Build the workspace.** Implement the responsive editor shell, real file editing, navigation, themes, execution controls, diagnostics, output, saving, sharing, and downloading.
3. **Write runnable content.** Add programming examples, proof examples, and a program with a proof of one of its properties. Each example has explanations and an expected result clearly separate from actual output.
4. **Add learning tools.** Add a structured course, syntax reference, contextual explanations, hints, and local progress.
5. **Validate and prepare deployment.** Run TypeScript, production build, meaningful runtime/content tests, and verify hosting headers. Provide Vercel configuration and documentation. External publishing and pull requests require the user's explicit approval.

## Visual direction

Quiet, precise, and editor-first: a warm light canvas and a deep charcoal dark theme, violet accents, restrained borders, compact navigation, generous code space, and clear typography. The right guide panel should make the current program understandable without interrupting editing.

## Research informing the plan

- [Lean's program execution model](https://leanprover.github.io/functional_programming_in_lean/hello-world/running-a-program.html): `lean --run` executes `main`; the browser implementation must make its supported equivalent explicit.
- [Lean browser runtime reference](https://github.com/cauli/lean4-wasm-in-browser): existing WASM integration provides a path to local checking and evaluation, with significant artifact and initialization costs.
- [lean4.js](https://github.com/timqian/lean4.js): a packaged alternative; its documented per-run initialization cost must be evaluated.
- [Vercel configuration](https://vercel.com/docs/project-configuration): configure the deployment and response headers for browser WASM.

## Deferred

Full Mathlib, third-party Lake packages, collaboration/accounts, a remote compiler, native executable downloads, and complete Lean language-server support. The first version must honestly identify runtime limitations while making every included completed example runnable.

## Implementation outcome

Implemented the editor workspace, 60 examples, 17 lessons, 85 syntax entries, themes, local persistence, sharing, diagnostics, and native execution guidance. The browser uses the smaller community Lean 4.33.0-pre WASM artifact with a pinned core library, served entirely from the app's origin. All setup scripts and tests use `.ts` as requested. The unused Cloudflare starter infrastructure was removed to keep deployment native to Vercel.

Validation includes actual WASM checks for every example and lesson solution, rejected unfinished starters, native `lean --run` for every program, and a built Lake executable. See README.md for repeatable commands and the supported runtime scope.

## September 2026 refinement

- Consolidate navigation on the left, with Examples beside a personal Playground, then Learn and Syntax. Keep the header to leanlab and Lean docs, at 46px high.
- Separate stored files from open tabs, migrate existing drafts, and support naming, renaming, downloading, and deleting personal files. A Copy to Playground action connects the example library to independent work.
- Add individual/all lesson-progress reset controls and the supplied Zcash donation address to Settings.
- Add 25 Top 100 explorations and six quadratic/algebra/cryptography examples, with sourced historical comments and explicit proof scope. Verify every snippet in the pinned browser compiler; distinguish theorem proofs from finite or algebraic cases.
- Keep the local app running for user review. Publishing a PR still requires explicit approval; the user separately authorized pushing this repository to main.

## Next release

See [the verification and advanced mathematics plan](docs/next-release-plan.md). Browser Mathlib is excluded from this release; the proposed zeta example is local-only. The next implementation group is a verified optimizer, a transfer invariant, and a verified compiler.
