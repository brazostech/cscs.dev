#!/usr/bin/env bash
# prefer-github-mcp.sh — PreToolUse hook for Bash
# Denies `gh pr`, `gh issue`, and `gh search` commands, directing
# Claude to the equivalent GitHub MCP server tools instead.
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

[ -z "$COMMAND" ] && exit 0

# Extract the gh subcommand (e.g., "gh pr create ..." → "pr")
if echo "$COMMAND" | grep -qE '(^|\s)gh\s+pr(\s|$)'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Use GitHub MCP tools instead of `gh pr`. Mapping: create → mcp__github__create_pull_request, view/diff/status/files/comments → mcp__github__pull_request_read (set method param), list → mcp__github__list_pull_requests, edit/close → mcp__github__update_pull_request, merge → mcp__github__merge_pull_request, review → mcp__github__pull_request_review_write, checks → mcp__github__pull_request_read (method: get_status)."
    }
  }'
  exit 0
fi

if echo "$COMMAND" | grep -qE '(^|\s)gh\s+issue(\s|$)'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Use GitHub MCP tools instead of `gh issue`. Mapping: create/edit/close → mcp__github__issue_write, view/comments/labels → mcp__github__issue_read (set method param), list → mcp__github__list_issues, comment → mcp__github__add_issue_comment."
    }
  }'
  exit 0
fi

if echo "$COMMAND" | grep -qE '(^|\s)gh\s+search(\s|$)'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Use GitHub MCP tools instead of `gh search`. Mapping: code → mcp__github__search_code, issues → mcp__github__search_issues, prs → mcp__github__search_pull_requests, repos → mcp__github__search_repositories."
    }
  }'
  exit 0
fi

exit 0
