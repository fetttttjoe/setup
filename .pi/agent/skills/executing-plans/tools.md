# Pi tools

| Phase | Pi tool | Purpose |
|---|---|---|
| Load plan | `read` | Read the plan file end to end |
| Critique — exists | `find` / `ls` | Confirm referenced files exist |
| Critique — content | `grep` / `read` | Confirm referenced functions / lines still match |
| Execute — edits | `edit` / `write` | Apply each task's changes |
| Verify per task | `bash` | Run the task's verify command, capture output |
| Final verify | `bash` | Run the plan-level test / build / smoke test |
