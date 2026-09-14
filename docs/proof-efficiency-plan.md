# Compare two proofs of the same theorem

Status: implemented on 2026-09-14. Both proof cards appear side by side above the
desktop editor, and stack inside the mobile lesson guide. The shared selector and
comparison button use the existing Lean worker. The implementation notes below
record the intended behavior and initial measurements.

The lesson shows both proof bodies and provides a measured comparison.
The theorem statement must be identical in both files; only its proof changes.

## Proof pair

Calculation:

```lean
theorem copies_length : (List.replicate 100 7).length = 100 := by
  decide
```

Theorem application:

```lean
theorem copies_length : (List.replicate 100 7).length = 100 := by
  exact List.length_replicate
```

Check these as separate files so their identical declaration names do not clash.
Keep the existing example IDs and offer links to open either file in the editor.

## Lesson and interface

1. Lead with the two highlighted proof blocks, displayed together. Use two columns
   only when there is enough space; stack them on mobile and in a narrow guide.
   Label them “Calculate the length” and “Reuse a theorem.”
2. Add a shared list-length control with bounded presets of 20, 50, and 100.
   Changing it updates both statements together. Start with 100, confirmed
   in Chromium; do not increase recursion or heartbeat limits.
3. Add **Compare both proofs**. After compiler initialization, perform one
   unmeasured check of each proof, then five measured checks each, alternating
   their order. Display each median in milliseconds and the observed ratio.
   Label this “Lean check time”: elaboration and kernel checking, excluding
   compiler download and initialization. Show the individual samples on demand.
4. Run comparisons through the existing worker lifecycle and cancellation path.
   Serialize checks, prevent another run from interleaving, and discard stale
   results if the selected length changes. Keep the editor's source intact.
   Do not download the compiler merely because someone opens the lesson.
5. Explain the mechanism in two short paragraphs: `decide` reduces the decision
   procedure, which computes this list's length; `exact List.length_replicate`
   applies an existing general theorem. Both proofs are checked by Lean.
6. Make the exercise “Replace the calculation with a theorem application.” Keep
   an unfinished starter with `sorry` so it cannot immediately pass. Show the
   calculation version above it, provide the theorem name as a hint, and check
   the completed proposition. Put general optimization tips in a short optional
   section after the comparison.

Do not promise a particular speedup, insert artificial delays, or treat a failed
check as a slow result. Safari currently exceeds its compiler stack limit on the
calculation example even at 20 elements. Keep both proofs readable there, show the
existing compatibility notice, and offer Run locally. Do not automatically run
a repeated benchmark on a browser with this known limitation.

## Initial measurements

On 2026-09-14, using the pinned slim compiler through the repository's Node WASM
driver, five alternating samples after an initial check gave these medians:

| List length | `decide` | `exact List.length_replicate` |
| --- | ---: | ---: |
| 20 | 7.3 ms | 2.7 ms |
| 50 | 10.4 ms | 2.4 ms |
| 100 | 16.7 ms | 1.9 ms |

At 200, the calculation reached Lean's default recursion limit. These are local
observations, not production-browser timings or performance guarantees. The
browser comparison must calculate its own results on the visitor's device.

## Implementation and validation

- Extend lesson metadata with an optional comparison referring to the existing
  two example IDs. Use a shared source generator for their theorem statements.
  Update `lib/advanced-examples.ts`, `lib/extra-lessons.ts`, and the guide renderer.
- Include both proofs and their explanations on the public lesson page and in
  the agent-readable guide; measurement controls remain interactive-editor UI.
- Preserve existing lesson IDs, completion records, and saved user code. Reset
  file remains the way to load an updated bundled starter into a saved tab.
- Check both variants at every supported length with real WASM. Verify that an
  unfinished exercise is rejected, and test progress, cancellation, source
  preservation, mobile stacking, and Safari guidance in browser CI.
- Test that times are actual completed-run measurements. Do not assert a fixed
  timing ratio in CI, where machine load varies.

Reference: [Lean tactic reference: decision procedures](https://lean-lang.org/doc/reference/latest/Tactic-Proofs/Tactic-Reference/).
