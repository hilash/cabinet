#!/bin/bash
# Cabinet Agent Loop — Uses ralph-loop stop hook to iterate through PRD phases
# Usage: ./run-agent.sh [max-iterations]
#
# This script:
# 1. Writes a ralph-loop state file that the stop hook reads
# 2. Launches Claude Code with the PRD implementation prompt
# 3. The stop hook blocks exit and re-feeds the prompt until:
#    - All PRD phases are done (agent outputs <promise>...</promise>)
#    - Max iterations reached
#    - User presses Ctrl+C

cd "$(dirname "$0")"

MAX_ITERATIONS="${1:-30}"
PROMPT_FILE="data/.agents/loop-prompt.md"
STATE_FILE=".claude/ralph-loop.local.md"

# Ensure .claude directory exists
mkdir -p .claude

# Read the prompt content
if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "❌ Prompt file not found: $PROMPT_FILE"
  exit 1
fi

PROMPT_CONTENT=$(cat "$PROMPT_FILE")

# Extract the completion promise from the prompt file
# Looks for <promise>...</promise> tag
COMPLETION_PROMISE=$(perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s' "$PROMPT_FILE" 2>/dev/null || echo "")

if [[ -z "$COMPLETION_PROMISE" ]]; then
  echo "⚠️  No <promise> tag found in prompt file. Loop will run until max iterations."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Cabinet Agent Loop"
echo "  Prompt: $PROMPT_FILE"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Completion: $COMPLETION_PROMISE"
echo "  Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Write the ralph-loop state file
# The stop hook reads this to decide whether to block exit
cat > "$STATE_FILE" << EOF
---
iteration: 1
max_iterations: $MAX_ITERATIONS
completion_promise: "$COMPLETION_PROMISE"
---

$PROMPT_CONTENT
EOF

echo "📝 State file written: $STATE_FILE"
echo "🚀 Launching Claude Code..."
echo ""

# Launch Claude with the prompt — the stop hook handles looping
cat "$PROMPT_FILE" | claude --dangerously-skip-permissions

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Cabinet Agent Loop — Finished"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Clean up state file if it still exists
if [[ -f "$STATE_FILE" ]]; then
  rm "$STATE_FILE"
  echo "🧹 Cleaned up state file"
fi
