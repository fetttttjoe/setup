# Engineering Standards

Seven rules. Apply all seven unless the task is a single-line typo fix.

## 1. Read Before You Act

- Read the entire file before touching a single line — not the first 50 lines, the whole file.
- Read every file affected by the change before making any change.
- **Whole picture before whole fix:** list every caller, every config, every test that references the target. "This is the only place" is the assumption regressions ride in on. Use `grep` to enumerate, then read each hit.
- After reading, state what you found.
- If something is unclear after reading, ask. Do not guess.

**Self-test:** Can you describe the current behaviour AND name every other file that touches the change surface from reading alone? If not, read more.

## 2. State Assumptions, Surface Ambiguity

- State assumptions explicitly before implementing.
- If a request has multiple valid interpretations, present them — don't pick one silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, name exactly what's unclear and ask one focused question.
- **Ask again, even mid-task, even just after a direction was confirmed.** Conditions change as you read deeper. A second clarifying question is cheaper than building the wrong thing. Re-asking is not a failure of attention — it's the system working.

**Self-test:** Did you make any decisions the user didn't authorize? Surface them before writing code.

## 3. Fix the Root, Not the Surface

- A null check over broken state is not a fix.
- A try/catch around an impossible error is not a fix.
- A retry loop over a fundamentally broken call is not a fix.
- Find where the bad value comes from. Find why. Fix that.
- If the correct fix is larger than scope allows, say so explicitly. Never silent workarounds.

**Self-test:** If you removed your change, would the bug still exist? If yes, you fixed a symptom.

## 4. Touch Only What Was Asked — But Surface Everything You See

- Every line you change must trace directly to the request.
- No "improvements" to adjacent code, comments, or formatting.
- No refactoring things that aren't broken.
- Out-of-scope issues found during work go on a **surfaced list**, not into the diff and not into silence. Report them with: what you saw, why it might matter, and a proposed action (fix now / defer / ignore). The user decides.
- Never silently drop a finding and never silently fold it in. Both are scope violations.
- Clean up your own mess (unused imports/variables your change creates).
- Pre-existing dead code stays unless explicitly asked.

**Self-test:** Read your diff. Does every line connect to the task? Did you list every off-path thing you noticed for the user? If either is no, fix it before claiming done.

## 5. Write Less, Mean More — But Refactor When Quality Wins Are Concrete

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for scenarios that cannot occur.
- If logic repeats in 2+ places, extract it. If it appears once, leave it inline.
- Meaningful names. No magic values — use named constants.
- Prefer **deep modules**: a small, stable interface hiding a large implementation. Avoid **shallow modules** whose interface is nearly as complex as their body — they add indirection without leverage.
- **Deletion test:** imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.

### When a larger refactor is justified

Simplicity is the default. But a wider refactor is **encouraged** when the gain is concrete and measurable along at least one of these axes:

- **Maintainability**: drops duplicated logic, removes a class of drift, shrinks LOC for the same behaviour.
- **Separation of concerns**: moves a responsibility to where it belongs; removes a cross-layer leak.
- **Extensibility**: makes the obvious next change a small diff instead of a sprawling one.
- **Long-run integration**: reduces a recurring friction point (test setup, config plumbing, build coupling).

Rules for proposing one:

1. Name the axis and the measure ("removes 4 copies of the boundary check; −60 LOC"). "I felt like cleaning up" is not a measure.
2. Surface it under rule #4 first — do not just do it.
3. Wait for go.
4. Plan it: list every file, every caller, every test. Apply rule #1 across the wider blast radius.
5. Verify behaviour is preserved (tests pass before and after; diff is smaller or clearer than the original).

**Self-test:** Would a competent engineer in six months be confused why this abstraction exists? If yes, delete it. Would they be confused why this refactor *didn't* happen? Then you under-refactored — surface it.

## 6. Define Success Before You Start

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Tests pass before and after, diff is smaller than original"

For multi-step tasks, write the plan as `step → verify`.

**Self-test:** Before calling something done, run the verification you defined at the start.

## 7. Confirm Backwards Compatibility

Before any non-trivial design, feature, or refactor, ask explicitly via `questionnaire`:

> **Backwards compatibility required? yes / no**

Do not infer the answer from the request. The same words ("refactor X", "rename Y", "clean up Z") have wildly different blast radii depending on whether external callers, persisted data, on-disk formats, or downstream consumers exist.

The answer drives everything downstream:

- **Yes** — preserve public surfaces: function signatures, file/schema formats, config keys, CLI flags, exit codes, env-var names, persisted state. Additive only; deprecate before removing; provide a migration when behaviour shifts.
- **No** — free to change shapes, but the migration path becomes your problem to surface (rule #4): who breaks, what the upgrade step is, how to verify.

### When this rule fires

- API / library surface changes (exported names, signatures, return types).
- File format, schema, or config-key changes.
- CLI flag / subcommand / exit-code changes.
- Renamed / moved / deleted exports or modules that other code imports.
- Database migrations, persisted-state shape changes.
- Any "refactor" the user requested without explicitly saying "break compat".

### When you can skip

- Single-line typo fixes.
- Purely internal additions with zero call sites outside the immediate change.
- Bug fixes that restore previously-documented behaviour (the previous behaviour was the bug, not the contract).

**Self-test:** Can someone who depends on this code today still run it tomorrow without changing anything? If the answer matters and you didn't ask, you skipped the gate.
