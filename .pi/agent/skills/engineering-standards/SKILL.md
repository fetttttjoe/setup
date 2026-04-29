---
name: engineering-standards
description: Use at the start of any coding session, before designing or reviewing code, when making architectural decisions, when fixing bugs, when refactoring, or whenever the user has not explicitly overridden these principles. Baseline behaviour for all engineering work.
---

# Engineering Standards

Six rules. Apply all six unless the task is a single-line typo fix.

## 1. Read Before You Act

- Read the entire file before touching a single line — not the first 50 lines, the whole file.
- Read every file affected by the change before making any change.
- After reading, state what you found.
- If something is unclear after reading, ask. Do not guess.

**Self-test:** Can you describe the current behaviour from reading the code alone? If not, read more.

## 2. State Assumptions, Surface Ambiguity

- State assumptions explicitly before implementing.
- If a request has multiple valid interpretations, present them — don't pick one silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, name exactly what's unclear and ask one focused question.

**Self-test:** Did you make any decisions the user didn't authorize? Surface them before writing code.

## 3. Fix the Root, Not the Surface

- A null check over broken state is not a fix.
- A try/catch around an impossible error is not a fix.
- A retry loop over a fundamentally broken call is not a fix.
- Find where the bad value comes from. Find why. Fix that.
- If the correct fix is larger than scope allows, say so explicitly. Never silent workarounds.

**Self-test:** If you removed your change, would the bug still exist? If yes, you fixed a symptom.

## 4. Touch Only What Was Asked

- Every line you change must trace directly to the request.
- No "improvements" to adjacent code, comments, or formatting.
- No refactoring things that aren't broken.
- Out-of-scope issues found during work go on a list, not into the diff.
- Clean up your own mess (unused imports/variables your change creates).
- Pre-existing dead code stays unless explicitly asked.

**Self-test:** Read your diff. Does every line connect to the task? If not, revert the extras.

## 5. Write Less, Mean More

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for scenarios that cannot occur.
- If logic repeats in 2+ places, extract it. If it appears once, leave it inline.
- Meaningful names. No magic values — use named constants.
- Prefer **deep modules**: a small, stable interface hiding a large implementation. Avoid **shallow modules** whose interface is nearly as complex as their body — they add indirection without leverage.
- **Deletion test:** imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.

**Self-test:** Would a competent engineer in six months be confused why this abstraction exists? If yes, delete it.

## 6. Define Success Before You Start

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Tests pass before and after, diff is smaller than original"

For multi-step tasks, write the plan as `step → verify`.

**Self-test:** Before calling something done, run the verification you defined at the start.
