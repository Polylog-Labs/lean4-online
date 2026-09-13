# Lean Lab

A TypeScript learning environment for Lean 4: an online editor, executable programs, checked proofs, guided exercises, and a syntax reference. Designed for Vercel.

## Start locally

Requirements: Node.js 22.13+ and npm. The setup script also uses `curl` and `tar` (available on macOS, Linux, and Vercel's build image).

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js (normally http://localhost:3000).

The first setup downloads a **277 MiB checksum-pinned Lean toolchain archive**. It packages the core library and the smaller WASM binary into `public/lean/`. The browser downloads roughly **101 MiB** on its first run, then caches the runtime. Initial import takes several seconds on a desktop; subsequent small examples generally finish in milliseconds. The UI remains responsive because Lean executes in a Web Worker.

All authored application code, setup scripts, and tests use TypeScript. There are no authored `.mjs` files. Generated Emscripten and Monaco assets are JavaScript and are ignored by Git.

## What works

- Monaco editor, Lean syntax highlighting, Unicode symbol suggestions, independent file tabs, and source-position diagnostics.
- 13 runnable examples covering programming, data types, IO, tactics, induction, and a program with a proof.
- 8 lessons with editable exercises, hints, solutions, and Lean-checked completion. Incorrect answers and `sorry` placeholders do not complete a lesson.
- 24 syntax reference entries with explanations and links to runnable examples.
- Run/check/stop, execution timeout, bounded output, and worker recovery.
- Light, dark, and system themes; responsive panels; keyboard shortcuts; resizable console.
- Device-local autosave and lesson progress; Unicode-safe share links; `.lean` file downloads.

## Execution model

**Check file** elaborates and checks the current source. Explicit `#eval` commands in that file also execute, following Lean's normal behavior. **Run program** additionally evaluates `main : IO Unit` through an appended `#eval main`. Outputs come from the real Lean WASM compiler; the guide's expected output is separately labeled reference material.

This browser version includes the **Init/core library**, with the matching `.olean`, `.ir`, and `.ir.sig` files. It uses a pinned community Lean **4.33.0-pre** WASM build. Files are independent snippets. This version does not bundle Mathlib, arbitrary Lake packages, a full language server, interactive terminal input, OS subprocesses, or a native compiler. Use a current desktop browser; the runtime requires WebAssembly shared memory and substantial available memory.

The app's **Run locally** guide explains the native path. Install Lean, download a program, and execute it with:

```sh
lean --run Hello.lean
```

To build a native executable, create an empty directory, run the following, replace the generated `Main.lean` with your program, and build:

```sh
lake init hello exe
lake build
.lake/build/bin/hello
```

The included programs have also been tested with native Lean 4.33.1, including building and running the Hello World Lake executable.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run test:lean
npm run build
```

`test:lean` executes every example, every lesson solution, and every unfinished starter against the actual pinned WASM binary. It also checks negative proofs/type errors. If native Lean is installed, it verifies `lean --run` for every program and the Lake executable workflow.

With the app running, verify the actual browser Web Worker and isolation headers:

```sh
# Linux/CI: install a test browser first
npx playwright install chromium
npm run test:browser-runtime
```

On macOS the test uses installed Google Chrome when available. Set `LEAN_LAB_URL` to test a different local/preview origin. This test exercises the runtime protocol, rather than screenshots or UI automation.

## Vercel

Import `Polylog-Labs/lean4-online` into Vercel with the **Next.js** preset. The checked-in `vercel.json` selects `npm ci` and `npm run build`. No environment variables or database are needed. No proof-checking server is used.

The production build prepares its own checksum-verified runtime assets. Do not commit `node_modules`, `.cache`, `.next`, or generated `public/lean` and `public/editor` directories. Deploy from the Git integration so the runtime is prepared in the build environment rather than uploading the large local cache through the CLI.

`next.config.ts` and `vercel.json` set:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These headers enable `SharedArrayBuffer`, required by threaded Lean WASM. Runtime URLs include the pinned build identifier and can be cached immutably. All runtime and editor assets are served from the same origin. Large artifacts are static files and do not pass through a serverless function.

## Project map

- `PLAN.md` — product and implementation plan.
- `components/` — workspace, editor, lessons, and reference UI.
- `lib/content.ts` — original examples, lesson content, solutions, and validation declarations.
- `lib/use-lean.ts` — worker lifecycle, cancellation, and timeouts.
- `lib/lean.ts` — diagnostic parsing, execution source generation, and snippet sharing.
- `runtime/lean.worker.ts` — actual Lean WASM host, library loading, and caching.
- `runtime/release.json` — exact upstream commits, artifact URLs, and SHA-256 checksums.
- `scripts/prepare-runtime.ts` — reproducible runtime download, verification, and packaging.
- `scripts/prepare-editor.ts` — locally served Monaco assets and compiled worker.
- `third_party/lean-wasm/` — runtime attribution and license.

## Credits

Lean and its WASM fork are Apache-2.0 licensed. Runtime initialization is informed by [cauli/lean4-wasm-in-browser](https://github.com/cauli/lean4-wasm-in-browser). The curriculum is original and links to the official [Functional Programming in Lean](https://lean-lang.org/functional_programming_in_lean/) and [Theorem Proving in Lean](https://lean-lang.org/theorem_proving_in_lean4/) books.

`public/og.png` is a bespoke social preview generated using the built-in image generation tool. Its brief: a warm ivory and violet Lean Lab card with the exact text “Lean Lab”, “Write code. Explore proofs.”, and “Learn Lean 4 in your browser”, alongside a minimal Hello World editor.
