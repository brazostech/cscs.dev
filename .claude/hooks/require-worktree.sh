#!/usr/bin/env bash
# require-worktree.sh — PreToolUse hook for Edit|Write
# Enforces that all implementation work happens in a git worktree,
# not the main working tree. Edits to .claude/ paths are exempted
# (configuration/hooks are meta-tasks).
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

# Exception: always allow edits to .claude/ configuration
if echo "$FILE_PATH" | grep -q '/\.claude/'; then
  exit 0
fi

# Detect if we're in a git worktree (not the main working tree).
# In the main tree, git-dir is ".git". In a worktree, it's a path
# containing "/worktrees/" (e.g., ../.git/worktrees/<name>).
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null || true)

if [ -z "$GIT_DIR" ]; then
  # Not in a git repo at all — allow (shouldn't happen in this project)
  exit 0
fi

if [ "$GIT_DIR" = ".git" ] || [ "$GIT_DIR" = "$(git rev-parse --show-toplevel 2>/dev/null)/.git" ]; then
  # We're in the main working tree — deny the edit
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Edits outside a git worktree are not allowed. Use EnterWorktree to create an isolated worktree before starting implementation work."
    }
  }'
  exit 0
fi

# In a worktree or other git-dir layout — allow
exit 0
