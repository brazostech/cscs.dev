#!/usr/bin/env bash
# test-agent-hooks.sh — checks that the work-on-issue skill and the repo's
# PreToolUse hook agree.
#
# Extracts every shell command the skill tells an agent to run (fenced
# blocks other than ```markdown/```text/```json, and inline `gh|git|npm|...` code spans), feeds each
# one to .claude/hooks/prefer-github-mcp.sh as PreToolUse JSON, and expects no
# deny. Negative controls (commands the hook must deny) keep the test from
# passing vacuously.
#
# Usage: scripts/test-agent-hooks.sh [path/to/SKILL.md]
set -euo pipefail

cd "$(dirname "$0")/.."

HOOK=.claude/hooks/prefer-github-mcp.sh
SKILL=${1:-.claude/skills/work-on-issue/SKILL.md}

command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }
[ -f "$SKILL" ] || { echo "skill not found: $SKILL" >&2; exit 2; }

# Prints the hook's decision for a command: "deny", "ask", "allow", ...
decision() {
  local out
  if ! out=$(jq -n --arg c "$1" '{tool_name: "Bash", tool_input: {command: $c}}' | "$HOOK"); then
    echo "error" # the hook crashed: report it as a failed check, not a silent abort
    return 0
  fi
  # The hook prints nothing when it has no objection.
  if [ -z "$out" ]; then
    echo allow
  else
    jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"$out"
  fi
}

failures=0
check() { # check <expected> <command> <label>
  local got
  got=$(decision "$2")
  if [ "$got" = "$1" ]; then
    echo "ok   $3: $got: ${2//$'\n'/ ; }"
  else
    echo "FAIL $3: expected $1, got $got: ${2//$'\n'/ ; }"
    failures=$((failures + 1))
  fi
}

# --- Negative controls: the hook must still deny these. ---------------------
for cmd in \
  'gh pr create --title x' \
  'gh pr checks 1 --repo brazostech/cscs.dev --watch' \
  'gh issue view 88 -R brazostech/cscs.dev' \
  'gh search issues cscs'; do
  check deny "$cmd" "control (must deny)"
done

# --- Positive controls: the hook must allow these. ---------------------------
for cmd in \
  'gh run list --repo brazostech/cscs.dev --limit 1' \
  'gh run watch 123 --repo brazostech/cscs.dev --exit-status' \
  'git status'; do
  check allow "$cmd" "control (must allow)"
done

# --- Extract the skill's commands. --------------------------------------------
commands=()
in_fence=0
fence_is_shell=0
block=""
inline_re='`([^`]+)`'
cmd_re='^(gh|git|npm|npx|node|make|curl|jq)[[:space:]]'

while IFS= read -r line; do
  trimmed="${line#"${line%%[![:space:]]*}"}"
  if [[ $trimmed == '```'* ]]; then
    if [ $in_fence -eq 0 ]; then
      in_fence=1
      lang="${trimmed#'```'}"
      # Unlabeled fences count as shell, so a missing label cannot hide a command.
      case "$lang" in markdown | md | text | txt | json) fence_is_shell=0 ;; *) fence_is_shell=1 ;; esac
      block=""
    else
      if [ $fence_is_shell -eq 1 ] && [ -n "$block" ]; then
        commands+=("$block")
      fi
      in_fence=0
      fence_is_shell=0
    fi
    continue
  fi
  if [ $in_fence -eq 1 ]; then
    if [ $fence_is_shell -eq 1 ]; then
      block="${block:+$block$'\n'}$trimmed"
    fi
    continue
  fi
  rest=$line
  while [[ $rest =~ $inline_re ]]; do
    matched="${BASH_REMATCH[0]}"
    span="${BASH_REMATCH[1]}"
    before="${rest%%"$matched"*}"
    # A span after "never" names a prohibited command, not an instruction.
    if [[ $span =~ $cmd_re ]] && [[ $before != *[Nn]ever\  ]]; then
      commands+=("$span")
    fi
    rest="${rest#*"$matched"}"
  done
done <"$SKILL"

# A broken extractor must not pass silently.
if [ "${#commands[@]}" -lt 5 ]; then
  echo "FAIL extracted only ${#commands[@]} commands from $SKILL (expected at least 5)"
  exit 1
fi

# --- Every command the skill instructs must pass the hook. -------------------
for cmd in "${commands[@]}"; do
  check allow "$cmd" "skill command"
done

if [ $failures -ne 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "all checks passed (${#commands[@]} skill commands)"
