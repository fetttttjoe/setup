---
name: tdd
description: Use when implementing any feature or bugfix, before writing implementation code. Test-driven development — red, green, refactor.
---

# Test-Driven Development

Tests first. Implementation second. Refactor third.

## When to use

- Implementing a new feature
- Fixing a bug (write a failing test that reproduces the bug first)
- Adding a new code path to existing logic

## When to skip

- Pure UI/visual changes with no logic
- Config-only changes
- One-line typo fixes
- The codebase has no test infrastructure (note this and ask before adding it)

## The cycle

### Red — write a failing test

- Write the smallest test that captures the requirement
- Run it. Confirm it fails for the right reason (assertion fails, not import error)
- The failure message should be informative

### Green — make it pass

- Write the minimum implementation to pass the test
- Don't optimise yet
- Don't add features the test doesn't require
- Run the test. Confirm it passes.

### Refactor — clean up

- Now that the test holds you safe, improve the code
- Remove duplication, rename for clarity, extract helpers
- Run the test after each change. It must still pass.

## Bug fixes

For bugs, the cycle is:

1. **Red:** Write a test that reproduces the bug. Confirm it fails.
2. **Green:** Fix the bug. Confirm the new test passes AND existing tests still pass.
3. **Refactor:** If the fix surfaced design issues, clean them up.

A bug fix without a regression test is incomplete.

## Anti-patterns

- Writing the implementation first, then writing tests to match
- Tests that don't actually fail before the implementation exists
- Tests that test implementation details instead of behaviour
- Skipping the refactor step because "it works"
