---
name: verification
description: Use before claiming work is complete, fixed, or passing, before committing or creating PRs. Requires running verification commands and confirming output before making any success claims.
---

# Verification Before Completion

Evidence before assertions. Always.

## The rule

Never claim something is "done", "fixed", "passing", or "working" without running the verification command and confirming the output.

This applies to:
- Implementation tasks ("I added X")
- Bug fixes ("I fixed Y")
- Refactors ("the tests still pass")
- Builds ("it compiles")
- Configuration changes ("pi accepts the new settings")

## Pre-completion checklist

Run through this before saying any form of "done":

1. **Compile / type-check** — does the code build without errors?
2. **Tests pass** — did you actually run the test suite?
3. **Linter / formatter clean** — no new warnings introduced?
4. **Manual smoke test** — did you actually run the thing?
5. **Diff review** — does every changed line connect to the task?
6. **Out-of-scope changes** — anything you noticed but didn't fix is noted separately?

## What to do when verification fails

- **Don't** silently retry or work around the failure
- **Do** report the failure honestly with the actual output
- **Do** trace it to the root cause (Rule 3 of engineering-standards)
- **Do** ask before deciding whether to fix it now or note it as out-of-scope

## What "verification" looks like

| Task type | Verification |
|---|---|
| Code change | Run the affected tests; show the pass/fail line |
| Bug fix | Run the regression test; show it passes; show pre-existing tests still pass |
| Build / config change | Run the build/start command; confirm it succeeds without warnings |
| Refactor | Diff is smaller than before; tests pass; no behavioural changes |
| New feature | All new tests pass; existing tests still pass; manual smoke test works |

## Anti-patterns

- "It should work" — should is not is
- "Tests should pass" — did you run them?
- "I think this is right" — verify or say "I haven't verified yet"
- Marking a task complete based on what the code looks like rather than what it does

## Output format

When claiming completion:

```
✅ Verified:
- <command run>
- <output observed>
- <how it confirms the task is done>
```

Not just "✅ done".
