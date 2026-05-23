# Global Agent Instructions

## Core engineering rules

- Read entire affected files before editing — not just the regions you touch.
- Look at the whole picture before changing one piece: list every caller, every config, every test that touches the target. Never assume "this is the only place".
- State assumptions explicitly. If a request has multiple valid interpretations, ask one focused question instead of guessing.
- Ask again whenever something becomes unclear — even mid-task, even just after a direction was confirmed. A second clarifying question is cheaper than the wrong build.
- Fix root causes, not symptoms. A null check over broken state is not a fix.
- Touch only what was asked. Side-findings get surfaced to the user ("saw X, propose Y, defer?") — never silently dropped, never silently folded in.
- Write minimal code by default. Larger refactors are fine when the quality win is concrete (fewer callers duplicating logic, clearer SoC, easier extension, measurable LOC drop) — propose the diff and the measure first, then do it.
- Define success criteria before implementing. Verify against them before claiming done.
- For any non-trivial design or refactor, confirm backwards compatibility (yes / no) before touching code — see `engineering-standards` rule #7.

## Skill discovery

Before starting any task, scan the available skills (the `<available_skills>` block in the system prompt) and decide:

1. Which existing skill matches the task — invoke it.
2. If none match cleanly but the task recurs, propose either extending an existing skill or creating a new one (follow the structure convention below).
3. If a skill matches partially, read it and note where it falls short before improvising.

Do not start coding before this scan. "Did I check the skills?" is a question to answer yes to, every task.

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
- `/skill:executing-plans` — load → critique → execute task-by-task → verify when running a written plan
- `/skill:using-git-worktrees` — set up an isolated workspace before risky / multi-task work
- `/skill:tdd` — red-green-refactor for any feature or bugfix
- `/skill:verification` — checklist before claiming work is complete
- `/skill:diagnose` — disciplined debugging loop: feedback-loop → reproduce → hypothesise → instrument → fix
- `/skill:zoom-out` — map unfamiliar code: modules, callers, and key seams
- `/skill:caveman` — ultra-compressed mode (~75% fewer tokens); say "caveman mode" to activate
- `/skill:commit-messages` — conventional commits, ≤2 lines, no AI/tool attribution

## Skill structure convention

Skills come in two layouts:

- **Single-file** (≤ ~40 lines): just `SKILL.md`. Used for tiny skills with no extra tooling (caveman, grill-me, zoom-out, commit-messages).
- **Split** (everything else, or any skill needing advanced tooling): `SKILL.md` (trigger + description), `instructions.md` (the process), `tools.md` (pi tools used). When a split skill is invoked, read all three files.

## Active extensions (background)

- `security-guidance.ts` — auto-blocks `edit`/`write` calls when the new content matches known unsafe patterns (eval, child_process.exec, innerHTML, pickle, os.system, GitHub Actions injection, etc.). Ported from Anthropic's `claude-plugins-official/security-guidance`. Dedup is per-session, per `(path, rule)`. Disable with `ENABLE_SECURITY_REMINDER=0`.

This keeps trigger descriptions cheap to auto-load and makes each skill independently swappable: when a skill is obsoleted by model improvements, drop the directory without hunting for tool dependencies elsewhere.

## Mode awareness

- `Ctrl+Alt+P` toggles plan ↔ build (or use `/plan` and `/build` explicitly).
- **Plan mode** is read-only: tools restricted to `read`, `grep`, `find`, `ls`, `questionnaire`. Produce a plan; do not modify files.
- **Build mode** restores the full tool set. Execute the plan.

The footer always shows the current mode. A banner appears below the editor when in plan mode.
