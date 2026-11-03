#!/usr/bin/env bash
# test-agent-hooks.sh — checks that every skill under .claude/skills/ and the
# repo's PreToolUse hook agree.
#
# For each skill it extracts every shell command the skill tells an agent to
# run (fenced blocks, ``` or ~~~, other than markdown/text/json ones, plus
# inline `gh|git|npm|...` code spans), feeds each one to
# .claude/hooks/prefer-github-mcp.sh as PreToolUse JSON, and expects no deny.
# A second, looser scan fails on any `gh pr|issue|search` anywhere in the
# skill text (after `cd x &&`, an env prefix, `$(...)`), except on lines that
# say "never". The test guards against passing vacuously with:
#   - negative controls (commands the hook must deny),
#   - a self-test of the extractor against a fixture,
#   - anchors for work-on-issue (commands that must be extracted),
#   - a check that settings.json registers the hook under the Bash matcher.
# It does not fix gaps in the hook itself (see #138).
#
# Usage: scripts/test-agent-hooks.sh [path/to/SKILL.md ...]
set -euo pipefail

cd "$(dirname "$0")/.."

HOOK=.claude/hooks/prefer-github-mcp.sh
SETTINGS=.claude/settings.json

command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }

if [ $# -gt 0 ]; then
  skills=("$@")
else
  skills=()
  for f in .claude/skills/*/SKILL.md; do
    [ -f "$f" ] && skills+=("$f")
  done
fi
[ "${#skills[@]}" -gt 0 ] || { echo "no skills found under .claude/skills/" >&2; exit 2; }
for f in "${skills[@]}"; do
  [ -f "$f" ] || { echo "skill not found: $f" >&2; exit 2; }
done

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
fail() {
  echo "FAIL $*"
  failures=$((failures + 1))
}
check() { # check <expected> <command> <label>
  local got
  got=$(decision "$2")
  if [ "$got" = "$1" ]; then
    echo "ok   $3: $got: ${2//$'\n'/ ; }"
  else
    fail "$3: expected $1, got $got: ${2//$'\n'/ ; }"
  fi
}

# --- Extraction ----------------------------------------------------------------
# scan_skill <file> fills these globals:
#   fenced_cmds   one entry per shell fence (the whole block)
#   inline_cmds   inline code spans that start with a known command
#   raw_hits      lines mentioning a denied gh subcommand anywhere (not "never" lines)
# It returns 1 if a fence is still open at the end of the file.
fenced_cmds=()
inline_cmds=()
raw_hits=()
inline_re='`([^`]+)`'
cmd_re='^(gh|git|npm|npx|node|make|curl|jq)[[:space:]]'
denied_re='(^|[[:space:];&|(`])gh[[:space:]]+(pr|issue|search)([[:space:]]|$)'

scan_skill() {
  fenced_cmds=()
  inline_cmds=()
  raw_hits=()
  local in_fence=0 fence_char="" fence_shell=0 block="" line trimmed lang rest matched span before
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    trimmed="${line#"${line%%[![:space:]]*}"}"
    if [[ $trimmed == '```'* || $trimmed == '~~~'* ]]; then
      if [ $in_fence -eq 0 ]; then
        in_fence=1
        fence_char="${trimmed:0:1}"
        lang="${trimmed#"${trimmed%%[!\`~]*}"}"
        lang="${lang%%[[:space:]]*}"
        # Unlabeled fences count as shell, so a missing label cannot hide a command.
        case "$lang" in markdown | md | text | txt | json) fence_shell=0 ;; *) fence_shell=1 ;; esac
        block=""
      elif [ "${trimmed:0:1}" = "$fence_char" ]; then
        if [ $fence_shell -eq 1 ] && [ -n "$block" ]; then
          fenced_cmds+=("$block")
        fi
        in_fence=0
        fence_shell=0
      fi
      continue
    fi
    if [ $in_fence -eq 1 ]; then
      if [ $fence_shell -eq 1 ]; then
        block="${block:+$block$'\n'}$trimmed"
        if [[ $trimmed =~ $denied_re && $trimmed != *[Nn]ever* ]]; then
          raw_hits+=("$trimmed")
        fi
      fi
      continue
    fi
    if [[ $line =~ $denied_re && $line != *[Nn]ever* ]]; then
      raw_hits+=("$line")
    fi
    rest=$line
    while [[ $rest =~ $inline_re ]]; do
      matched="${BASH_REMATCH[0]}"
      span="${BASH_REMATCH[1]}"
      before="${rest%%"$matched"*}"
      # A span after "never" names a prohibited command, not an instruction.
      if [[ $span =~ $cmd_re ]] && [[ $before != *[Nn]ever\  ]]; then
        inline_cmds+=("$span")
      fi
      rest="${rest#*"$matched"}"
    done
  done <"$1"
  if [ $in_fence -eq 1 ]; then
    return 1
  fi
}

# found <needle>: true if an extracted command or raw hit contains the needle.
found() {
  local c
  for c in ${fenced_cmds[@]+"${fenced_cmds[@]}"} ${inline_cmds[@]+"${inline_cmds[@]}"} ${raw_hits[@]+"${raw_hits[@]}"}; do
    [[ $c == *"$1"* ]] && return 0
  done
  return 1
}

# --- Self-test: the extractor must see a denied command in every position. -----
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
cat >"$fixture/positions.md" <<'MD'
# Fixture

```bash
gh pr view 1
```

```
gh pr view 2
```

~~~bash
gh pr view 3
~~~

Run `gh pr view 4` now.
Run `cd x && gh pr view 5` now.
Run `FOO=1 gh pr view 6` now.
Run `$(gh pr view 7)` now.

```text
gh pr view 8
```

Never `gh pr view 9`.
MD
printf '```bash\ngh pr view 1\n' >"$fixture/unclosed.md"

if scan_skill "$fixture/positions.md"; then
  for n in 1 2 3 4 5 6 7; do
    found "pr view $n" || fail "extractor self-test: missed 'gh pr view $n'"
  done
  for n in 8 9; do
    ! found "pr view $n" || fail "extractor self-test: wrongly flagged 'gh pr view $n'"
  done
else
  fail "extractor self-test: positions fixture reported an unclosed fence"
fi
if scan_skill "$fixture/unclosed.md"; then
  fail "extractor self-test: unclosed fence not detected"
fi

# --- Negative controls: the hook must still deny these. -----------------------
for cmd in \
  'gh pr create --title x' \
  'gh pr checks 1 --repo brazostech/cscs.dev --watch' \
  'gh issue view 88 -R brazostech/cscs.dev' \
  'gh search issues cscs'; do
  check deny "$cmd" "control (must deny)"
done

# --- Positive controls: the hook must allow these. ----------------------------
for cmd in \
  'gh run list --repo brazostech/cscs.dev --limit 1' \
  'gh run watch 123 --repo brazostech/cscs.dev --exit-status' \
  'git status'; do
  check allow "$cmd" "control (must allow)"
done

# --- settings.json must register the hook for the Bash tool. ------------------
if jq -e '[.hooks.PreToolUse[]? | select(.matcher == "Bash") | .hooks[]? | .command // "" | endswith("/prefer-github-mcp.sh")] | any' "$SETTINGS" >/dev/null; then
  echo "ok   settings.json registers prefer-github-mcp.sh under the Bash matcher"
else
  fail "$SETTINGS does not register prefer-github-mcp.sh under the Bash matcher"
fi

# --- Every skill: its commands must pass the hook. ----------------------------
total=0
for skill in "${skills[@]}"; do
  echo "== $skill"
  if ! scan_skill "$skill"; then
    fail "$skill: a code fence is never closed"
    continue
  fi
  # Anchors: work-on-issue is known to contain these. If fence or span
  # extraction breaks, the loop below would pass vacuously.
  if [ "$(basename "$(dirname "$skill")")" = work-on-issue ] || [ $# -gt 0 ]; then
    [ "${#fenced_cmds[@]}" -ge 3 ] || fail "$skill: extracted ${#fenced_cmds[@]} fenced commands (expected at least 3)"
    [ "${#inline_cmds[@]}" -ge 5 ] || fail "$skill: extracted ${#inline_cmds[@]} inline commands (expected at least 5)"
    found "gh run watch" || fail "$skill: anchor missing: gh run watch"
    found "git push" || fail "$skill: anchor missing: git push"
  fi
  for ((i = 0; i < ${#fenced_cmds[@]}; i++)); do
    check allow "${fenced_cmds[$i]}" "skill command"
    total=$((total + 1))
  done
  for ((i = 0; i < ${#inline_cmds[@]}; i++)); do
    check allow "${inline_cmds[$i]}" "skill command"
    total=$((total + 1))
  done
  for ((i = 0; i < ${#raw_hits[@]}; i++)); do
    fail "$skill: mentions a denied gh subcommand: ${raw_hits[$i]}"
  done
done

if [ $failures -ne 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "all checks passed ($total skill commands in ${#skills[@]} skill(s))"
