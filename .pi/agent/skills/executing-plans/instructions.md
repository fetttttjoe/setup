# Executing Plans

Take a written plan, run it task-by-task, verify each step, report honestly.

## When to use

- A plan exists (from `writing-plans` or as a spec doc) and the user said "go" / "execute" / "implement this".
- The plan has discrete, ordered tasks with verification criteria.

## When to skip

- The "plan" is two sentences in chat — just do the work under `engineering-standards`.
- The user is still iterating on the plan — go back to `writing-plans` or `brainstorming`.

## Process

### Step 1 — Load and critique

1. Read the plan file end to end before touching anything else.
2. Re-read the affected source files (engineering-standards rule 1).
3. Check the plan against reality:
   - Do the file paths and function names still exist?
   - Are the verification commands runnable in this environment?
   - Did the codebase change since the plan was written?
4. If you find gaps, contradictions, or stale assumptions: **stop and raise them with the user before starting.** Do not silently work around plan problems.

### Step 2 — Execute task-by-task

For each task, in plan order:

1. State which task you're starting.
2. Do the work as the plan specifies. Don't improvise the structure.
3. Run the verification the plan defines for that task.
4. Report the verification result (actual output, not "looks good").
5. Move to the next task.

Do not batch tasks. Each gets its own verify-and-report cycle. If the plan groups tasks into phases, a phase boundary is a natural checkpoint to summarise progress.

### Step 3 — Handle blockers

Stop and ask for guidance — do not improvise — when:

- A verification fails and you can't trace it to a clear fix in scope.
- A step's instruction is genuinely ambiguous (more than one reasonable interpretation).
- A step's assumption is wrong (the file the plan expects doesn't exist, the API it calls has changed).
- A required dependency is missing.

When asking, say which task, what you tried, what the actual output was, and the 1–2 paths forward you see.

### Step 4 — Revisit the plan when needed

If executing reveals that the plan itself is wrong (not just a single broken step), stop and renegotiate the plan. Don't force through a broken plan; don't quietly rewrite it either. Surface the mismatch.

### Step 5 — Final report

When all tasks pass:

1. Run any plan-level / cross-task verification (full test suite, full build, smoke test).
2. Show the actual output.
3. List anything noticed but deliberately deferred (out-of-scope per engineering-standards rule 4).
4. Then declare done — under the rules of the `verification` skill.

## Anti-patterns

- **Skipping critique.** Plans go stale. Reading the plan and reading the code are different things.
- **Batching verifications.** Running tests once at the end hides which task broke something.
- **Forcing through blockers.** "It probably works" is not a verification.
- **Silently rewriting the plan.** If the plan is wrong, say so. Don't pretend you executed it as written.
- **Improvising scope.** Touching files the plan didn't list, or adding "while I'm here" cleanups.

## Note on subagents

If your harness supports subagents (tuihi natively, pi via the subagent extension) and they are configured, you can dispatch a fresh subagent per task with a tight context. That's a separate workflow — only worth it if subagents are already set up.
