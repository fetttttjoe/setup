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

### Step 4 — Persist the design (when it's non-trivial)

For anything beyond a one-file change, write the approved design to `docs/specs/YYYY-MM-DD-<topic>.md` (or wherever the project keeps specs) before moving to a plan or code. This gives the implementation phase — and future sessions — a stable reference.

Skip the doc for: single-file changes, throwaway prototypes, projects where you've already opened a plan that captures the design inline.

### Spec self-review

After writing the design doc, scan it once with fresh eyes:

- **Placeholders** — any `TBD`, `TODO`, or vague "appropriate" / "reasonable" hand-waving? Resolve or delete.
- **Internal consistency** — do the sections contradict each other? Does the stated architecture match the feature description?
- **Ambiguity** — could any requirement be read two different ways? Pick one and make it explicit.
- **Scope** — is this focused enough for one implementation, or does it need to be split?

Fix inline. Don't re-review. Then hand back to the user for sign-off on the written doc — the in-conversation approval was for the verbal design; this confirms the written version is what they meant.

## Implementation handoff

Do not invoke an implementation skill from inside brainstorming. The next skill is `writing-plans` (for multi-step work) or direct implementation under `engineering-standards` / `tdd` (for small focused changes). Wait for the user to say go.

## Anti-patterns

- Asking 10 questions when 2 would do
- Asking about implementation details before understanding intent
- Skipping straight to code because "it's obvious"
- Adding features the user didn't ask for to "round out" the design
