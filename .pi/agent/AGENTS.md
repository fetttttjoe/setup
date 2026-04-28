# Global Agent Instructions

## Core engineering rules

- Read entire affected files before editing — not just the regions you touch.
- State assumptions explicitly. If a request has multiple valid interpretations, ask one focused question instead of guessing.
- Fix root causes, not symptoms. A null check over broken state is not a fix.
- Touch only what was asked. Note out-of-scope issues separately.
- Write minimal code. No speculative abstractions, no error handling for impossible scenarios.
- Define success criteria before implementing. Verify against them before claiming done.

## Token efficiency

- Prefer pi's native `read`, `grep`, `find`, `ls` tools over `bash` for file operations. They return structured filtered output; `bash` returns raw terminal output.
- For multi-file searches use `grep` with patterns, not `bash` + ripgrep.
- For directory exploration use `ls` or `find`, not `bash` + ls.

## Skills available

Invoke these explicitly when the task fits, or let the agent auto-load by description.

- `/skill:engineering-standards` — full quality gates and verification checklist
- `/skill:brainstorming` — explore intent and design before any creative work
- `/skill:writing-plans` — produce a structured plan for any multi-step task
- `/skill:tdd` — red-green-refactor for any feature or bugfix
- `/skill:verification` — checklist before claiming work is complete

## Mode awareness

- **Plan mode** (Ctrl+Alt+P or `/plan`): read-only. Produce a plan; do not modify files.
- **Build mode** (Ctrl+Alt+P or `/build`): execute the plan with full tools.

The footer always shows the current mode. A banner appears below the editor when in plan mode.
