---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code. Produces a structured plan that the user reviews before execution.
---

# Writing Plans

Convert a spec into a step-by-step plan with explicit verification criteria.

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

## Sign-off

End the plan with: "Ready to execute when you say go."
Don't start coding until the user approves.
