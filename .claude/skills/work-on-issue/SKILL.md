---
name: work-on-issue
description: Full lifecycle workflow for a GitHub issue — fetch context, create worktree, investigate, plan, implement, verify, commit, open a PR, and monitor CI.
disable-model-invocation: true
argument-hint: "[issue-number]"
---

# Work on Issue

Complete workflow to take a GitHub issue from triage to pull request.

**Repository**: `brazostech/cscs.dev` (owner `brazostech`, repo `cscs.dev`). Use these literal values in every GitHub call below.
**Issue number**: `$ARGUMENTS` (required, a bare issue number such as `88` — abort with a clear message if empty)

---

## Step 1 — Fetch Issue Context

Gather all issue details in parallel:

- `mcp__github__issue_read` with method `get`, owner `brazostech`, repo `cscs.dev`, issue_number `$ARGUMENTS`
- `mcp__github__issue_read` with method `get_comments`, same owner/repo/issue_number
- `mcp__github__issue_read` with method `get_labels`, same owner/repo/issue_number

Summarize the issue to the user: title, description, labels, and any discussion highlights.

If the issue is not found (404), stop and tell the user.

---

## Step 2 — Create Worktree

Derive a short slug from the issue title (lowercase, hyphens, max 40 chars).

Call `EnterWorktree` with name `issue-$ARGUMENTS-{slug}`.

If the worktree already exists, ask the user whether to reuse it or pick a new name.

---

## Step 3 — Investigate

Read files mentioned in the issue body or comments. Search the codebase for related patterns using Grep and Glob. Build enough context to design a solution. Use the Explore agent for deeper investigation if needed.

---

## Step 4 — Plan

Call `EnterPlanMode` and write a clear implementation plan. This is a **hard gate** — do not proceed until the user approves the plan via `ExitPlanMode`.

The plan should reference specific files, functions, and line numbers discovered in Step 3.

---

## Step 5 — Implement

Make changes following CLAUDE.md conventions:

- Use Catalyst UI components where applicable
- Support dark mode (`dark:` Tailwind variants)
- Use TypeScript strict mode types
- Follow the project's naming and import conventions
- Keep changes minimal and focused on the issue

---

## Step 6 — Verify

Run these commands **sequentially** (each must pass before the next):

1. `npm run build` — must exit 0
2. `npm run lint` — must exit 0
3. `npm run format` — applies Prettier formatting

If build or lint fails, fix the errors and re-run from the failing step. Do not proceed to commit with broken build/lint.

---

## Step 7 — Commit

1. Run `git status` and `git diff` to review all changes
2. Stage **specific files** (never `git add -A`)
3. Create a commit with a conventional commit message:

```text
<type>: <short description>

<body explaining what and why>

Closes #$ARGUMENTS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Use the appropriate type: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

---

## Step 8 — Create PR

1. Push the branch: `git push -u origin HEAD`
2. Create the PR using `mcp__github__create_pull_request`:
   - owner: `brazostech`
   - repo: `cscs.dev`
   - title: Short description (under 70 chars)
   - head: current branch name
   - base: `main`
   - body: Use this template:

```markdown
## Summary

- <1-3 bullet points describing the changes>

Closes #$ARGUMENTS

## Test plan

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual verification of <specific things to check>

Generated with [Claude Code](https://claude.com/claude-code)
```

3. Print the PR URL to the user.

---

## Step 9 — Monitor CI

After the PR is created, wait for CI to complete and fix any failures.

The repo's hook denies the `gh` subcommands for pull requests, issues and search, so read PR status through the GitHub MCP server. The `gh` subcommands for workflow runs are not blocked, so use them to wait.

The GitHub Actions `build` job is a check run. `get_status` returns only legacy commit statuses (here, the Netlify deploy preview), so take the Actions result from `gh run watch --exit-status` and its logs from `gh run view`.

1. Find the workflow run for the pushed commit. If the list is empty or its `headSha` differs from `git rev-parse HEAD`, wait a few seconds and list again, for up to 2 minutes; if no run for the current commit appears by then, stop and report to the user. A run with conclusion `cancelled` for an older commit was superseded by the concurrency group, so ignore it and look for the run for the current commit:

   ```bash
   gh run list --repo brazostech/cscs.dev --branch "$(git branch --show-current)" --limit 1 --json databaseId,status,conclusion,headSha
   ```

   If the run for the current commit itself ends `cancelled`, re-run it once with `gh run rerun <run-id> --repo brazostech/cscs.dev`, then watch the new run. If it is cancelled again, report it to the user.

2. Wait for that run to finish. A run can outlast the Bash tool's timeout, so run the command with the longest timeout available, or in the background:

   ```bash
   gh run watch <run-id> --repo brazostech/cscs.dev --exit-status
   ```

   If the command times out before the run ends, list the run again and watch it again, or poll its state with `gh run view <run-id> --repo brazostech/cscs.dev --json status,conclusion`.

3. Read the external statuses, such as the Netlify deploy preview, which `gh run` does not show: call `mcp__github__pull_request_read` with method `get_status`, owner `brazostech`, repo `cscs.dev`, pullNumber `<PR-number>`. For check-run details, call the same tool with method `get_check_runs`. If a status is still pending, wait a minute and call it again, for at most 10 minutes. After that, report the pending status to the user instead of waiting longer.

4. **If all checks pass** → proceed to Step 10.

5. **If any check fails** (max 3 fix attempts):
   a. Identify the failure: a failed `gh run watch` is the Actions `build` job; a failed or errored status from `get_status` is an external check such as Netlify.
   b. For an Actions failure, get the logs:

   ```bash
   gh run view <run-id> --repo brazostech/cscs.dev --log-failed
   ```

   c. Fix the failures in the worktree.
   d. Re-run Step 6 (Verify) locally to confirm the fix.
   e. Stage specific files, commit with a message like `fix: resolve CI failure in <check-name>`, and push.
   f. Loop back to find the new run (step 9.1) and watch it.

6. **If still failing after 3 attempts** → tell the user, provide the PR URL and failing check details, and proceed to Step 10.

---

## Step 10 — Cleanup

Ask the user: "Should I close issue #$ARGUMENTS now, or let the PR merge close it automatically?"

- If close now → `mcp__github__issue_write` with method `update`, owner `brazostech`, repo `cscs.dev`, issue_number `$ARGUMENTS`, state `closed`, state_reason `completed`
- If let PR close it → confirm the `Closes #$ARGUMENTS` reference is in the PR body (it is from Step 8)

---

## Error Handling

| Scenario                     | Action                                                          |
| ---------------------------- | --------------------------------------------------------------- |
| Issue not found              | Stop immediately, tell the user                                 |
| Worktree name conflict       | Ask user for alternative name                                   |
| Build fails                  | Fix errors, re-run build                                        |
| Lint fails                   | Fix errors, re-run lint                                         |
| Push rejected                | Pull with rebase, resolve conflicts, push again                 |
| PR already exists for branch | Show existing PR URL, ask user how to proceed                   |
| CI check fails               | Inspect logs, fix errors, push fix, re-monitor (max 3 attempts) |
| CI monitoring timeout        | Tell user to check CI manually, provide PR link                 |
