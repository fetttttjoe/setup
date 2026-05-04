# Pi tools

Map of the six rules to the pi affordances that enforce them.

| Rule | Pi tool | Purpose |
|---|---|---|
| 1. Read before act | `read` | Read each affected file in full before editing |
| 1. Read before act | `grep` / `find` | Locate every file the change touches before changing one |
| 2. Surface ambiguity | `questionnaire` | One focused question with concrete options instead of guessing |
| 4. Touch only what was asked | `edit` | Precise text replacement; avoids drift into unrequested rewrites |
| 6. Define success | `bash` | Run the verification command defined upfront |

Prefer `read` / `grep` / `find` / `ls` over `bash` for file ops — structured output, lower token cost.
