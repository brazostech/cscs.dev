# .claude/ Directory

Configuration for Claude Code agents working in this repository.

## Settings

| File                  | Committed        | Purpose                                               |
| --------------------- | ---------------- | ----------------------------------------------------- |
| `settings.json`       | Yes              | Deny rules (yarn/pnpm/bun), hook definitions          |
| `settings.local.json` | No (.gitignored) | Allow rules for MCP tools, Playwright, gcloud, podman |

## Hooks

Hooks run before tool execution. Defined in `settings.json`, scripts in `hooks/`.

| Script                 | Triggers On | Purpose                                                                                                    |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `guard-paths.sh`       | Edit, Write | Hard-blocks edits to `dist/`, `node_modules/`, `.astro/`. Soft-asks before editing `catalyst/` components. |
| `require-worktree.sh`  | Edit, Write | Blocks edits outside a git worktree. Exempts `.claude/` directory for config changes.                      |
| `prefer-github-mcp.sh` | Bash        | Blocks `gh pr`, `gh issue`, `gh search` commands and redirects to GitHub MCP tools with a mapping table.   |

## Skills

| Skill           | Invocation                      | Purpose                                                                       |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `work-on-issue` | `/work-on-issue <issue-number>` | Full issue lifecycle: triage → worktree → plan mode → implement → verify → PR |

Skill definitions live in `skills/<name>/SKILL.md`.

`work-on-issue` calls GitHub through an MCP server registered as `github` (tools are named `mcp__github__*`). The repo does not commit an `.mcp.json`, so register the server yourself, per user, for example with `claude mcp add` at user or local scope, under the name `github`. Without it the skill cannot run end to end.

Every shell command a skill tells an agent to run must pass the hooks. `scripts/test-agent-hooks.sh` extracts the commands from `work-on-issue/SKILL.md`, feeds each through `prefer-github-mcp.sh`, and fails on any deny. CI runs it. GitHub reads and writes go through the GitHub MCP tools; the skill waits on CI with `gh run list` and `gh run watch`, which the hook does not block.

## Worktrees

All implementation work happens in `.claude/worktrees/` (gitignored). `EnterWorktree` creates them automatically. One worktree per unit of work.

Example path: `.claude/worktrees/issue-42-add-dark-mode/`
