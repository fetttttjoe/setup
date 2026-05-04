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
- `/skill:grill-me` — relentless one-question-at-a-time design interview; more aggressive than brainstorming
- `/skill:writing-plans` — produce a structured plan for any multi-step task
- `/skill:tdd` — red-green-refactor for any feature or bugfix
- `/skill:verification` — checklist before claiming work is complete
- `/skill:diagnose` — disciplined debugging loop: feedback-loop → reproduce → hypothesise → instrument → fix
- `/skill:zoom-out` — map unfamiliar code: modules, callers, and key seams
- `/skill:caveman` — ultra-compressed mode (~75% fewer tokens); say "caveman mode" to activate

## Skill structure convention

Skills come in two layouts:

- **Single-file** (≤ ~40 lines): just `SKILL.md`. Used for tiny meta-skills (caveman, grill-me, zoom-out).
- **Split** (everything else): `SKILL.md` (trigger + description), `instructions.md` (the process), `tools.md` (pi tools used). When a split skill is invoked, read all three files.

This keeps trigger descriptions cheap to auto-load and makes each skill independently swappable: when a skill is obsoleted by model improvements, drop the directory without hunting for tool dependencies elsewhere.

## Mode awareness

- `Ctrl+Alt+P` toggles plan ↔ build (or use `/plan` and `/build` explicitly).
- **Plan mode** is read-only: tools restricted to `read`, `grep`, `find`, `ls`, `questionnaire`. Produce a plan; do not modify files.
- **Build mode** restores the full tool set. Execute the plan.

The footer always shows the current mode. A banner appears below the editor when in plan mode.
