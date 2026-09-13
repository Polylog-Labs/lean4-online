# Browser compiler compatibility

## Current status

The editor supports desktop and mobile layouts. The complete example collection
passes in Chromium. Full Safari/iPhone compiler compatibility is **not yet
established**: the pinned community WASM compiler exceeds WebKit's call-stack
limit on some valid Lean files. This is separate from editor loading and syntax
highlighting.

On 2026-09-13, Playwright 1.63.0 / WebKit build 2359 on macOS ARM64 reported
`Maximum call stack size exceeded` in both headless and headed runs. Failures
included Welcome.lean, Functions.lean, the ring examples, SHA256.lean, and the
tail-recursion example. An audit using a fresh worker for each example failed
on 33 of the 60 examples in this WebKit build. Even a short `List.replicate` reduction can fail after
another program has run. This is not a mathematical counterexample or a Lean
type error. A native Safari/iPhone check is still required; emulation is not a
physical-device test.

The app now reports **Browser stack limit reached**, preserves the source, and
offers **Run locally** with download and execution instructions. The failed
worker is terminated; the next run can initialize another worker using cached
downloads. No proof is reported as checked when the compiler fails.

## Checks and reproduction

- `npm run test:lean` checks all examples, syntax snippets, lesson solutions,
  unfinished starters, and SHA-256 vectors in Node's WASM runtime. It also runs
  native programs when Lean is installed.
- `npm run test:browser-runtime` checks every example and its output in Chromium.
- `npm run test:editor-webkit` checks desktop and mobile editor behavior, a small
  IO program, `2 + 2 = 4`, diagnostics, and recovery from the specific stack-limit
  failure. It prints the known limitation if that failure occurs; unrelated
  runtime errors fail the test.
- `npm run test:browser-runtime -- --webkit` runs the complete catalog check in
  WebKit. This additional compatibility check currently fails on macOS; it is
  not part of the passing CI smoke-test claim.

CI runs the first three checks against the production build as appropriate.
Passing those checks does not mean every example works in Safari.

To reproduce manually, open the site in Safari, select Examples → Welcome, and
run the file. Also test SHA-256 and the two proof-efficiency examples after a
successful run. Record the browser version, device, source, and whether the
compiler was already loaded.

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
