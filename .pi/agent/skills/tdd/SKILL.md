---
name: tdd
description: Use when implementing any feature or bugfix, before writing implementation code. Test-driven development — red, green, refactor.
---

# Test-Driven Development

Tests first. Implementation second. Refactor third.

## Philosophy

**Tests verify behaviour through public interfaces, not implementation details.** Code can change entirely; tests shouldn't.

Good tests are integration-style: they exercise real code paths through public APIs. They describe _what_ the system does, not _how_. A good test reads like a spec — "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

Bad tests are coupled to implementation. They mock internal collaborators, test private methods, or verify state through side-channels instead of the interface. The warning sign: your test breaks when you refactor, but behaviour hasn't changed.

## When to use

- Implementing a new feature
- Fixing a bug (write a failing test that reproduces the bug first)
- Adding a new code path to existing logic

## When to skip

- Pure UI/visual changes with no logic
- Config-only changes
- One-line typo fixes
- The codebase has no test infrastructure (note this and ask before adding it)

## Anti-pattern: horizontal slices

**Do not write all tests first, then all implementation.** This is "horizontal slicing" — treating RED as "write all tests" and GREEN as "write all code."

This produces bad tests:

- Tests written in bulk test _imagined_ behaviour, not _actual_ behaviour
- You end up testing the shape of things (data structures, function signatures) rather than user-facing behaviour
- Tests become insensitive to real changes — they pass when behaviour breaks, fail when behaviour is fine
- You outrun your headlights, committing to test structure before understanding the implementation

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
  ...
```

**Correct approach: vertical slices via tracer bullets.** One test → one implementation → repeat. Each test responds to what you learned from the previous cycle. Because you just wrote the code, you know exactly what behaviour matters and how to verify it.

## The cycle

### Red — write a failing test

- Write the smallest test that captures **one** behaviour
- Run it. Confirm it fails for the right reason (assertion fails, not import error)
- The failure message should be informative

### Green — make it pass

- Write the minimum implementation to pass this test
- Don't optimise yet
- Don't add features the test doesn't require
- Run the test. Confirm it passes.

### Refactor — clean up

- Now that the test holds you safe, improve the code
- Remove duplication, rename for clarity, extract helpers
- Run the test after each change. It must still pass.
- Never refactor while RED. Get to GREEN first.

Repeat the cycle for the next behaviour.

## Bug fixes

For bugs, the cycle is:

1. **Red:** Write a test that reproduces the bug. Confirm it fails.
2. **Green:** Fix the bug. Confirm the new test passes AND existing tests still pass.
3. **Refactor:** If the fix surfaced design issues, clean them up.

A bug fix without a regression test is incomplete.

## Per-cycle checklist

```
[ ] Test describes behaviour, not implementation
[ ] Test uses public interface only
[ ] Test would survive an internal refactor
[ ] Code is the minimum needed to pass this test
[ ] No speculative features added
```

## Anti-patterns

- Writing the implementation first, then writing tests to match
- Tests that don't actually fail before the implementation exists
- Tests that test implementation details instead of behaviour
- Skipping the refactor step because "it works"
- Horizontal slicing — see above
