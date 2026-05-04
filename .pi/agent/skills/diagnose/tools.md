# Pi tools

Map of the six diagnosis phases to pi affordances.

| Phase | Pi tool | Purpose |
|---|---|---|
| 1. Feedback loop | `bash` | Run the harness, test, curl, replay, or bisection script |
| 1. Feedback loop | `write` | Author throwaway harness / replay / fixture |
| 2. Reproduce | `bash` | Re-run loop; confirm symptom matches user's report |
| 3. Hypothesise | `questionnaire` | Show ranked hypotheses; let user re-rank cheaply |
| 4. Instrument | `edit` | Insert `[DEBUG-xxxx]`-tagged probes at decision boundaries |
| 4. Instrument | `read` / `grep` | Inspect logs and trace boundaries between hypotheses |
| 5. Fix + regression test | `edit` | Apply the fix; add the regression test at a correct seam |
| 5. Fix + regression test | `bash` | Re-run loop and test; confirm both go green |
| 6. Cleanup | `grep` | Find every `[DEBUG-xxxx]` tag for removal |
| 6. Cleanup | `edit` | Remove instrumentation; delete throwaway prototypes |
