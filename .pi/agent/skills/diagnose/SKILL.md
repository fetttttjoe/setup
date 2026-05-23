---
name: diagnose
description: Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says "diagnose this" / "debug this", reports a bug, says something is broken/throwing/failing, or describes a performance regression.
---

# Diagnose

This skill is split for portability. **When invoked, read [instructions.md](instructions.md) and [tools.md](tools.md). Load the optional companion files only when their trigger fits:**

1. [instructions.md](instructions.md) — the six-phase diagnosis loop
2. [tools.md](tools.md) — pi tools used by this skill
3. [condition-based-waiting.md](condition-based-waiting.md) — load when the bug involves flaky tests with `sleep`/`setTimeout`
4. [defense-in-depth.md](defense-in-depth.md) — load when the bug was caused by invalid data flowing through multiple layers
