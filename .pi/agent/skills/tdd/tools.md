# Pi tools

Map of the red-green-refactor cycle to pi affordances.

| Phase | Pi tool | Purpose |
|---|---|---|
| Red — find seam | `grep` / `find` | Locate the right test file and existing patterns |
| Red — write failing test | `edit` / `write` | Add the new test (one behaviour) |
| Red — confirm failure | `bash` | Run the test; verify it fails for the right reason |
| Green — minimum impl | `edit` | Smallest change that makes this test pass |
| Green — confirm pass | `bash` | Run the test suite; confirm pass + no regressions |
| Refactor | `edit` | Clean up while staying green |
| Refactor — re-verify | `bash` | Re-run tests after each refactor step |
