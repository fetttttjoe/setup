# Pi tools

Map of the pre-completion checklist to pi affordances.

| Check | Pi tool | Purpose |
|---|---|---|
| Compile / type-check | `bash` | Run the build / typecheck command |
| Tests pass | `bash` | Run the test suite; capture the pass/fail line |
| Linter / formatter clean | `bash` | Run linter; confirm no new warnings |
| Manual smoke test | `bash` | Actually run the thing end-to-end |
| Diff review | `bash` (`git diff`) | Confirm every changed line traces to the task |
| Inspect output | `read` / `grep` | Re-read failing output before claiming root cause |
