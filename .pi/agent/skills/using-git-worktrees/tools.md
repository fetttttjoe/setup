# Pi tools

| Phase | Pi tool | Purpose |
|---|---|---|
| Detect isolation | `bash` | Run `git rev-parse` checks |
| Check ignore status | `bash` | `git check-ignore` on chosen dir |
| Edit `.gitignore` | `edit` | Add worktree dir if not ignored |
| Create worktree | `bash` | `git worktree add` (fallback path) |
| Project setup | `bash` | Detect manifest, run installer |
| Baseline verify | `bash` | Run the project test command |
