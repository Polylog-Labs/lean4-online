# Browser compiler compatibility

## Current status

The editor supports desktop and mobile layouts. The complete example collection
passes in Chromium. Full Safari/iPhone compiler compatibility is **not yet
established**: the pinned community WASM compiler exceeds WebKit's call-stack
limit on some valid Lean files. This is separate from editor loading and syntax
highlighting.

On 2026-09-13, Playwright 1.63.0 / WebKit build 2359 on macOS ARM64 reported
`Maximum call stack size exceeded` in both headless and headed runs. The initial failures
included Welcome.lean, Functions.lean, the ring examples, SHA256.lean, and the
tail-recursion example. An audit using a fresh worker for each example failed
on 33 of the 60 examples in this WebKit build. Even a short `List.replicate` reduction can fail after
another program has run. This is not a mathematical counterexample or a Lean
type error. A native Safari/iPhone check is still required; emulation is not a
physical-device test.

On 2026-09-14, the new BLAKE3 example also exceeded this WebKit build's stack
limit in a fresh worker. It carries the same Safari notice and Run locally option
as SHA-256. The example and its reference vectors pass in Chromium and Node WASM.

## Safari behavior

A normal mobile visit opens Welcome.lean. Saved files remain available; explicit
shared-program, example, and lesson links open their requested content. On mobile,
Output opens below the source; Code or the close button expands the editor.
A pre-run note and the download panel explain that the Lean compiler runs as
WebAssembly on the device and source code is not uploaded.

- Safari/WebKit receives notices on examples and exercises with observed stack
  failures. The optional **Hide Safari limitations** filter applies to the
  catalog and lesson navigation. It does not close files, remove progress, or
  prevent users from running code. Unmarked content is not a compatibility guarantee.
- Exercises are classified independently of their related example. For example,
  the tail-recursion invariant exercise runs even though its executable example
  exceeds the tested WebKit stack limit. Related examples carry their own badges.
- Desktop Safari waits for Run or Check before downloading the compiler, as the
  mobile layout already does. Other desktop browsers retain idle preloading.
- Safari uses a fresh compiler worker per run when the downloaded artifacts are
  cached. The page keeps a Cache Storage handle open so WebKit retains the cache
  when the worker closes. Cached bytes still undergo checksum verification.
  Worker cache keys use absolute URLs. When storage is unavailable, the existing
  worker is retained to avoid an automatic download on every successful run.
- Welcome and Functions now print numeric results directly, avoiding the string
  interpolation that overflowed in the initial examples. The IO lesson validates
  its string with `rfl` instead of reducing a string decision procedure. The
  incorrect starter still fails its check. Saved source is not overwritten; use
  **Reset file** to load a revised bundled example into an existing tab.
- These changes leave the compiler build and approximately 45.9 MB download
  unchanged. Restarting from cached data adds initialization time but releases
  compiler memory between runs and avoids the observed failure from worker reuse.

If execution exceeds the stack limit, the app reports **Browser stack limit
reached**, preserves the source, and offers **Run locally** with download and
execution instructions. No failed or incomplete proof completes a lesson.
Compatibility metadata lives in `lib/browser-compatibility.ts`; revisit it when
changing the examples or pinned compiler. Safari detection is a user-agent
heuristic used for guidance and runtime lifecycle choices, never for denying access.

## Checks and reproduction

- `npm run test:lean` checks all examples, syntax snippets, lesson solutions,
  unfinished starters, and SHA-256/BLAKE3 vectors in Node's WASM runtime. It also runs
  native programs when Lean is installed.
- `npm run test:browser-runtime` checks every example and its output in Chromium.
- `npm run test:editor-webkit` checks desktop and mobile editor behavior, repeated
  introductory programs and the IO lesson, cache reuse across fresh workers,
  compatibility notices/filtering, `2 + 2 = 4`, diagnostics, and recovery from the specific stack-limit
  failure. It prints the known limitation if that failure occurs; unrelated
  runtime errors fail the test.
- `npm run test:browser-runtime -- --webkit` runs the complete catalog check in
  WebKit. This additional compatibility check currently fails on macOS; it is
  not part of the passing CI smoke-test claim.

CI runs the first three checks against the production build as appropriate.
Passing those checks does not mean every example works in Safari.

To reproduce manually, open a fresh workspace in Safari and run Welcome, then
Writing functions repeatedly. Check that later runs show cached downloads. Open
SHA-256 to inspect its compatibility notice and Run locally instructions. Toggle
Hide Safari limitations in Examples and Learn; existing tabs must remain open.
Record the browser version, device, source, and whether the compiler was already loaded.

## Runtime investigation

A local Binaryen 132 experiment converted calls in eligible return positions
to WebAssembly tail calls. This allowed Welcome and Functions to run in the
tested WebKit build, but rings, SHA-256, and tail recursion still overflowed.
An additional optimization pass did not resolve those failures. The experiment
is **not shipped**: runtime artifacts, checksums, and the approximately 45.9 MB
download remain unchanged.

Further work must investigate the compiler's remaining recursive paths and
validate a reproducible runtime build across Chromium, Firefox, desktop Safari,
and iOS. Do not work around the audit by increasing the browser's stack through
test-only launch settings. Raising Lean's `maxRecDepth` or `maxHeartbeats` does
not enlarge the browser's stack. Mathlib would add download and memory costs;
it does not solve this issue.

The current runtime continues to come from the pinned
[community Lean WASM project](https://github.com/cauli/lean4-wasm-in-browser).
WebKit documents [WebAssembly tail-call support in Safari 18.2](https://webkit.org/blog/16301/webkit-features-in-safari-18-2/).
