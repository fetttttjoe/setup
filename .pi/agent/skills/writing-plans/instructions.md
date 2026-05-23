# Writing Plans

Convert a spec into a step-by-step plan with explicit verification criteria.

**Reader assumption:** write for a competent engineer who has zero context for this codebase and questionable taste. Exact file paths, complete code or commands, no placeholders. They will read tasks out of order — don't say "like task 3", repeat what matters.

**Persist the plan:** save to `docs/plans/YYYY-MM-DD-<feature-name>.md` (or wherever the project keeps plans). A plan that lives only in chat history doesn't survive a context reset.

## When to use

- The task has 3+ distinct steps
- Multiple files will be touched
- The user said "plan this out" or asked for a plan
- Risk of going down the wrong path before verification

## Plan structure

```
## Plan: <one-line summary>

### Phase 1 — <category>
1. **Step 1.1** — <what>
   - **Why:** <reason>
   - **Files:** <which>
   - **Verify:** <how to confirm done>

2. **Step 1.2** — ...

### Phase 2 — ...

## Verification matrix
| Test | Expected result |
|---|---|

## Files touched
```

## Required sections

- **Plan summary** — one line, plain English
- **Phases** — group related steps; lowest-risk phases first
- **Steps** — each has Why, Files, Verify
- **Verification matrix** — concrete tests with expected outcomes
- **Files touched** — every file you'll create or modify, listed once

## Bite-sized steps

Each step is one action a competent engineer can do in 2–5 minutes. Steps that touch code show the actual code; steps that run commands show the exact command and expected output.

Plan-failure patterns — never write these:

- `TBD`, `TODO`, `implement later`, `fill in details`
- "Add appropriate error handling" / "handle edge cases" without saying which cases or how
- "Write tests for the above" without the actual test code
- "Similar to step N" — repeat what matters, the reader may be reading out of order
- References to types, functions, or methods not defined in any step

## Risk ordering

- Phase 1 = lowest-risk, fully reversible (config tweaks, comment changes)
- Phase 2 = medium-risk (new files, isolated changes)
- Phase 3 = highest-risk (changes that affect existing behaviour)

This order means a failed late phase doesn't block earlier wins.

## Research gates

If a phase requires information you don't have, insert a **research gate** as its first step. Do the research, then make a decision on the path forward, then commit.

```
### Step X.1 — RESEARCH GATE
Investigate <thing>. Decision branch:
- If A → take path 1 (cheap)
- If B → take path 2 (medium)
- If neither → take path 3 (expensive)
```

## Self-review before sign-off

With fresh eyes, scan the plan against the spec:

1. **Spec coverage** — for each requirement in the spec, point to the task that implements it. List any gaps.
2. **Placeholder scan** — any of the failure patterns above? Fix them.
3. **Type/name consistency** — a function called `clearLayers()` in step 3 but `clearFullLayers()` in step 7 is a bug. Same for property names, file paths, command flags.

Fix inline. No need to re-review.

## Sign-off

End the plan with: "Ready to execute when you say go."
Don't start coding until the user approves. Execution happens under the `executing-plans` skill.
