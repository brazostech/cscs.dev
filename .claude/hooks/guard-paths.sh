#!/usr/bin/env bash
# guard-paths.sh — PreToolUse hook for Edit|Write
# - DENY edits to dist/, node_modules/, .astro/ (generated/vendor dirs)
# - ASK before edits to src/components/catalyst/ (UI kit — don't modify unless necessary)
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

# Hard deny: generated/vendor directories
if echo "$FILE_PATH" | grep -qE '/(dist|node_modules|\.astro)/'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Editing generated/vendor directories (dist/, node_modules/, .astro/) is not allowed."
    }
  }'
  exit 0
fi

# Soft guard: Catalyst UI Kit
if echo "$FILE_PATH" | grep -q '/src/components/catalyst/'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: "This is a Catalyst UI Kit component (pre-built from Tailwind UI). Do not modify unless absolutely necessary."
    }
  }'
  exit 0
fi

exit 0
