# Using Git Worktrees

Get an isolated workspace for the upcoming work. Prefer existing isolation, then native tools, then `git worktree` as a fallback.

**Core principle:** detect existing isolation first; never fight the harness.

## When to use

- Starting a feature that shouldn't touch the user's current branch.
- About to execute a multi-step plan whose verification needs a clean baseline.
- The user explicitly asked for a worktree.

## When to skip

- The user said work in place.
- Single-line typo or doc fix.
- You're already inside an isolated worktree (Step 0 confirms this).

## Step 0 — Detect existing isolation

Before creating anything, check whether the current directory is already a linked worktree:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
SUBMODULE=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
```

- If `GIT_DIR != GIT_COMMON` **and** `SUBMODULE` is empty → already a linked worktree. **Skip to Step 3.**
- If inside a submodule (`SUBMODULE` non-empty) → treat as a normal repo.
- Otherwise → normal checkout. Ask for consent before creating a worktree (unless the user already opted in):

> "Set up an isolated worktree for this work? Keeps your current branch untouched."

If declined, work in place and skip to Step 3.

## Step 1 — Create the worktree

**1a. Prefer native tools.** If your harness or platform provides a worktree command (`/worktree`, `EnterWorktree`, a `--worktree` flag), use it. Native tools handle placement, branching, and cleanup in a way the harness can see. Manual `git worktree add` creates phantom state.

**1b. Fall back to `git worktree`** only when no native tool is available.

### Directory selection (priority order)

1. **User preference** stated in instructions or this session.
2. **Project-local existing dir:** `.worktrees/` (preferred) or `worktrees/`. If both exist, `.worktrees` wins.
3. **Default:** `.worktrees/` at project root.

### Safety check for project-local dirs

The worktree directory **must** be gitignored before creating anything in it, or you'll pollute the repo:

```bash
git check-ignore -q .worktrees 2>/dev/null
```

If not ignored: add the directory to `.gitignore`, commit, *then* create the worktree.

### Create

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
path=".worktrees/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

If `git worktree add` fails with a permission/sandbox error, report it and work in the current directory instead.

## Step 3 — Project setup

Auto-detect and run the right setup once inside the worktree:

```bash
[ -f package.json ]    && npm install
[ -f Cargo.toml ]      && cargo build
[ -f pyproject.toml ]  && poetry install
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f go.mod ]          && go mod download
```

## Step 4 — Verify a clean baseline

Run the project's tests before doing any new work. A failing baseline means you can't tell new bugs from pre-existing ones.

If baseline tests fail: report which ones, ask whether to proceed regardless or investigate first.

## Step 5 — Report

```
Worktree ready at <full-path> on branch <name>
Baseline: <N tests passing, 0 failures> (or: tests skipped, reason)
Ready to implement <feature>.
```

## Quick reference

| Situation | Action |
|---|---|
| Already in linked worktree | Skip to Step 3 |
| In a submodule | Treat as normal repo |
| Native worktree tool available | Use it (Step 1a) |
| No native tool | `git worktree` fallback (Step 1b) |
| `.worktrees/` exists, gitignored | Use it |
| `.worktrees/` exists, not gitignored | Add to `.gitignore` + commit first |
| Permission error on create | Report; work in place |
| Baseline tests fail | Report; ask before proceeding |

## Anti-patterns

- Creating a worktree without running Step 0 — produces nested worktrees.
- Using `git worktree add` when the harness has a native worktree command.
- Creating a project-local worktree directory without verifying it's gitignored.
- Skipping the baseline test verification.
- Proceeding with a failing baseline silently.
