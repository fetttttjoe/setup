# Pi tools

Map of the seven rules to the pi affordances that enforce them.

| Rule | Pi tool | Purpose |
|---|---|---|
| 1. Read before act | `read` | Read each affected file in full before editing |
| 1. Read before act | `grep` / `find` | Enumerate every caller, config, and test that touches the change surface |
| 2. Surface ambiguity | `questionnaire` | One focused question with concrete options instead of guessing; also for re-asking mid-task |
| 4. Touch only what was asked | `edit` | Precise text replacement; avoids drift into unrequested rewrites |
| 5. Refactor when justified | `grep` / `read` | Verify the wider blast radius before proposing a larger refactor |
| 6. Define success | `bash` | Run the verification command defined upfront |
| 7. Confirm backcompat | `questionnaire` | Hard gate: yes/no on backwards compatibility before non-trivial work |

Prefer `read` / `grep` / `find` / `ls` over `bash` for file ops — structured output, lower token cost.
