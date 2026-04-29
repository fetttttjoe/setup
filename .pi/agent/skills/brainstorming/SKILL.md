---
name: brainstorming
description: Use before any creative work — creating features, building components, adding functionality, or modifying behaviour. Explores user intent, requirements, and design before implementation.
---

# Brainstorming

Before writing code for anything non-trivial, surface intent and design.

## When to use

- Creating a new feature, component, or system
- Modifying behaviour in a non-obvious way
- The user said "build X" or "add Y" without spec details
- Multiple valid implementations exist and the user didn't specify

## When to skip

- Single-line typo fixes
- The user already gave a complete specification
- The task is purely mechanical (rename, format, version bump)

## Process

### Step 1 — Understand intent

Ask 1–3 focused questions to disambiguate the request:

- What problem are you solving?
- Who is the user? What workflow does this fit into?
- What's the minimum that would make this useful?

Use the question tool with concrete options. Recommend a default ("Recommended") so the user can pick fast.

### Step 2 — Surface decisions

Identify the choices the implementation forces:

- Storage: in-memory, file, database?
- Trigger: manual command, automatic event, scheduled?
- Scope: single user, team, global?
- Failure mode: silent, log, throw, retry?

Present each as a question with concrete options. Don't decide silently.

### Step 3 — Propose minimal design

Once intent and decisions are settled, propose:

- The smallest change that satisfies the requirement
- The files that will be touched
- The verification criteria for "done"

Get explicit approval before implementing.

## Anti-patterns

- Asking 10 questions when 2 would do
- Asking about implementation details before understanding intent
- Skipping straight to code because "it's obvious"
- Adding features the user didn't ask for to "round out" the design
