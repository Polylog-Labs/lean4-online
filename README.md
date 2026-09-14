# Lean Lab

A TypeScript learning environment for Lean 4: an online editor, executable programs, checked proofs, guided exercises, and a syntax reference. Designed for Vercel.

## Start locally

Requirements: Node.js 24.x and npm. `.nvmrc`, Vercel, and CI use the same Node major. The setup script also uses `curl` and `tar` (available on macOS, Linux, and Vercel's build image).

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js (normally http://localhost:3000).

The first setup downloads a **277 MiB checksum-pinned Lean toolchain archive**. It packages the core library and the smaller WASM binary into `public/lean/`. The browser downloads **45.9 MB of compressed compiler and library data**, plus the small JavaScript loader, on its first run. The UI displays downloaded MB, total MB, and bytes reused from cache. Later runs reuse the cached data. The compiler is the same slim build used from the first version; the uncompressed 70 MB binary is now transferred as a 13.8 MB gzip pack. Compression reduces transfer size, not the compiler’s in-memory size. Initial import takes several seconds on a desktop; subsequent small examples generally finish in milliseconds. The UI remains responsive because Lean executes in a Web Worker.

All authored application code, setup scripts, and tests use TypeScript. There are no authored `.mjs` files. Generated Emscripten and Monaco assets are JavaScript and are ignored by Git.

The page is prerendered as static content for CDN caching. Desktop browsers preload Monaco and prepare Lean in the background after the editor is ready. Phones and touch devices use a lightweight CodeMirror editor with syntax highlighting, a symbol toolbar, indentation, Unicode abbreviations, search, undo/redo, and diagnostic navigation. They do not download Monaco or start Lean until **Run** or **Check** is pressed. Desktop users can also edit in the native field while Monaco loads.

The WASM heap starts at **64 MiB** and grows as needed, replacing the previous 1 GiB starting allocation. In the Chromium smoke test, the heap reached approximately **133 MiB** when ready and **275 MiB** after running all 60 examples. These measurements exclude JavaScript, library files, and browser overhead; they are not total tab memory. Physical mobile-device testing is still needed to establish practical memory limits.

## What works

- Monaco on desktop and CodeMirror on mobile; syntax highlighting, Unicode input, independent file tabs, and source-position diagnostics. The mobile editor is limited to 150 KB compressed (excluding shared React) by a CI check.
- 61 editable examples: Welcome.lean, first proofs and Curry–Howard, programs, 25 Top 100 explorations, finite fields, cryptography (including SHA-256 and BLAKE3), and efficiency. The sorry example intentionally reports an incomplete proof; every other example is complete.
- A compact header and left navigation: Examples, Playground, Learn, Syntax. Collapsible, searchable example groups.
- A personal My files directory with program/proof starters, create, rename, download, delete, and independent tabs. Copy any example into Playground; closing a tab retains your file.
- 17 lessons with editable exercises, hints, solutions, and Lean-checked completion. Incorrect answers and `sorry` placeholders do not complete a lesson.
- The proof-efficiency lesson compares identical theorem statements with `decide` and `exact List.length_replicate`. Both proofs share a size selector (20, 50, or 100), and checking times are medians of five runs after warm-up. Compiler loading is excluded. Safari shows guidance for its known stack limitation.
- 85 syntax reference entries with explanations, Unicode input shortcuts, and editable snippets that open in Playground.
- Run/check/stop, execution timeout, bounded output, and worker recovery.
- Dark mode by default, with light and system themes in Settings; keyboard shortcuts; resizable explorer, guide, and console with saved layout preferences. Mobile uses a navigation drawer and separate Code, Output, and Guide views.
- Device-local autosave and lesson progress; Unicode-safe share links; `.lean` file downloads. Original v1 drafts migrate automatically to a file store with separately tracked tabs.
- Reset individual lessons or all completed lesson progress in Settings without deleting code.
- A Zcash donation address and copy button in Settings.
- Paired proof-efficiency examples, tail recursion with a correctness theorem, and a core-only SHA-256 implementation. Nineteen SHA-256 reference vectors cover padding boundaries, multiple blocks, Unicode, and escaped strings. Core `hash` is separately explained as non-cryptographic.
- Public `/examples` and `/learn` reading pages with all source and lesson text available without JavaScript, plus `/llms.txt`, `/agent.txt`, `/agents.txt`, `/llms-full.txt`, robots, and sitemap routes. Reading pages do not load the editor or compiler.

## Mathematics collection

The 25 selected topics come from the [Top 100 theorem list](http://pirate.shu.edu/~kahlnath/Top100.html), using its [Lurch reproduction](https://lurch.plus/100/) for historical metadata and [Freek Wiedijk’s index](https://www.cs.ru.nl/~freek/100/) for the corrected theorem titles. Comments and guides include historical milestones, a mathematical fact, a source, and the exact scope of the Lean statement. Ancient dates are approximate; unknown dates remain marked unknown. These are original educational Lean snippets, not copied formalizations from that index.

The collection deliberately distinguishes general proofs (Cantor, natural-number induction, finite sums), identities or restricted theorems (Pythagorean triples, quadratic completion, two-dimensional Cauchy–Schwarz), and concrete explorations (Heron, Wilson, perfect numbers). It does **not** claim 25 full formalizations of the named historical theorems. The examples use the existing core runtime and do not require Mathlib. `grind`, `omega`, explicit witnesses, induction, and finite `decide` proofs all produce checked evidence.

The field examples verify the commutative ring axioms and nonzero inverses on all elements of concrete finite types, without creating Mathlib typeclass instances. The cryptography programs use tiny educational parameters: they prove agreement/round-trip properties, not security, and are not encryption tools for real data.

## Execution model

**Check file** elaborates and checks the current source. Explicit `#eval` commands in that file also execute, following Lean's normal behavior. **Run program** additionally evaluates `main : IO Unit` through an appended `#eval main`. Outputs come from the real Lean WASM compiler; the guide's expected output is separately labeled reference material.

This browser version includes the **Init/core library**, with the matching `.olean`, `.ir`, and `.ir.sig` files. It uses a pinned community Lean **4.33.0-pre** WASM build. Files are independent snippets. This version does not bundle Mathlib, arbitrary Lake packages, a full language server, interactive terminal input, OS subprocesses, or a native compiler. The runtime requires a current browser with WebAssembly shared memory and sufficient available memory. The mobile editor, a small IO program, basic proof checking, and error recovery are tested in WebKit with touch-device emulation. Safari shows notices for affected examples and lessons, with an optional filter that keeps all saved files accessible. Mobile visits open Welcome.lean unless a share or content link requests another file. Some examples exceed the pinned compiler’s WebKit call-stack limit; full Safari/iPhone runtime compatibility is not established. This does not replace testing on physical phones. See [browser compatibility](docs/browser-compatibility.md).

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

`test:lean` executes every example, every syntax snippet, every lesson solution, and every unfinished starter against the actual pinned WASM binary. It also checks negative proofs/type errors. If native Lean is installed, it verifies `lean --run` for every program and the Lake executable workflow.

CI runs on every push and pull request via `.github/workflows/ci.yml`: TypeScript, lint, unit tests, all 61 examples, 85 syntax snippets, and lesson checks in WASM, native programs with Lean 4.33.1, a Lake executable, the production build, and all examples in Chromium. Chromium checks direct CORS downloads, live progress, cache reuse, SHA-256 and BLAKE3 vectors, a WASM heap below 512 MiB, no-JavaScript reading pages, catalog links into the editor, and donation clipboard feedback. The BLAKE3 checks cover all 35 official unkeyed 32-byte vectors and seven UTF-8 text cases checked with the official reference implementation. WebKit checks on-demand Safari startup, repeated introductory programs with cached downloads and fresh workers, compatibility notices and filtering, the mobile Welcome entry point, panel resizing and persistence, mobile highlighting, Unicode input, file switching, undo/redo, program execution, and diagnostic navigation. Native Lean is mandatory in CI. The toolchains are cached by version. The browser suite yields between compiles to catch runtime shutdowns between user actions.

To run the production browser smoke test locally after building:

```sh
npm run test:production
```

This starts and stops an isolated production server on an automatically assigned local port, leaving existing development servers running. With the development app already running, verify the actual browser Web Worker and isolation headers:

```sh
# Linux/CI: install a test browser first
npx playwright install chromium webkit
npm run test:browser-runtime
```

On macOS the Chromium test uses installed Google Chrome when available. Set `LEAN_LAB_URL` to test a different local/preview origin. `test:browser-runtime` exercises the worker protocol; `test:editor-webkit` tests desktop and mobile editor interactions.

## Vercel

Import `Polylog-Labs/lean4-online` into Vercel with the **Next.js** preset. The checked-in `vercel.json` selects `npm ci` and `npm run build`. No environment variables or database are needed. No proof-checking server is used.

`package.json` pins Node to `24.x`, allowing patch updates without switching major versions. The `allowScripts` entries approve only the reviewed esbuild and unrs-resolver versions, whose install scripts locate or install their platform binaries. Review these entries when updating those packages. Monaco is bundled from ESM with the pinned DOMPurify patch, replacing its embedded older sanitizer as well as updating the dependency tree.

The production build prepares its own checksum-verified runtime assets. Do not commit `node_modules`, `.cache`, `.next`, or generated `public/lean` and `public/editor` directories. Deploy from the Git integration so the runtime is prepared in the build environment rather than uploading the large local cache through the CLI.

`next.config.ts` and `vercel.json` set:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These headers enable `SharedArrayBuffer`, required by threaded Lean WASM. Runtime URLs include the pinned build identifier and can be cached immutably. Worker scripts and editor assets are served from the app origin. Large runtime packs can be downloaded directly from a separate public host (see below). Large artifacts are static files and do not pass through a serverless function.

## Direct runtime downloads

The worker supports `LEAN_ASSET_BASE_URL`, an HTTPS directory containing the six `.pack` files generated by setup. Requests go from the browser directly to that URL, without a Vercel proxy. When this setting is present at build time, the large packs are omitted from the Vercel deployment. The versioned manifest and pthread JavaScript loader remain on the app origin. Every pack is verified against its pinned size and SHA-256 before use, and the decompressed compiler is also checked against the upstream checksum. A download failure is shown to the user; it does not silently fall back to Vercel bandwidth.

Prepare a runtime-only directory for a public GitHub repository or another static host:

```sh
npx tsx scripts/export-runtime.ts
```

The command writes `.cache/runtime-public/<version>/` with six gzip packs, a checksum manifest, and licenses. It does not publish anything. A public repository can be served through an immutable jsDelivr URL such as `https://cdn.jsdelivr.net/gh/OWNER/RUNTIME-REPO@FULL_COMMIT`. A private repository cannot supply anonymous browser downloads. GitHub Release download links do not provide the required browser CORS headers and are not interchangeable with these CDN URLs.

The host must return `Access-Control-Allow-Origin: *` (or the app origin) and serve `.pack` files as raw bytes without a `Content-Encoding: gzip` header, because the worker decompresses them. The browser sends no credentials or source code to the asset host. Avoid a Next.js rewrite or serverless proxy: that would put the large downloads back through Vercel.

Without `LEAN_ASSET_BASE_URL`, the packs are served locally, which is the default development setup. Simply preparing a public bundle does not activate external hosting.

## Project map

- `PLAN.md` — product and implementation plan.
- `docs/next-release-plan.md` — proposed verification projects, coding theory, and a local-only Mathlib zeta article. Browser Mathlib is excluded from this release because of its download cost.
- `lib/site-guide.ts` — public agent documentation generated from the current content.
- `lib/learning-examples.ts`, `lib/advanced-examples.ts`, `lib/hash-examples.ts` — additional runnable examples.
- `lib/extra-lessons.ts`, `lib/extra-syntax.ts` — further curriculum and syntax entries.
- `components/` — workspace, editor, lessons, and reference UI.
- `lib/content.ts` — foundational examples, lesson content, solutions, and validation declarations.
- `lib/math-examples.ts` — 25 classic-math explorations plus the quadratic, algebra, finite-field, and cryptography collection.
- `lib/workspace.ts` — file validation, collision handling, tab persistence, and v1 draft migration.
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
