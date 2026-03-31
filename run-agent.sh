#!/bin/bash
# Cabinet Agent Loop — restarts Claude Code when it stops
# Usage: ./run-agent.sh [prompt-file]

cd "$(dirname "$0")"
export CABINET_AGENT_LOOP=1

PROMPT_FILE="${1:-data/.agents/loop-prompt.md}"

RUN=1
while true; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Cabinet Agent — Run #$RUN — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "  Prompt: $PROMPT_FILE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "Read and execute $PROMPT_FILE" | claude --dangerously-skip-permissions

  echo ""
  echo "[Run #$RUN finished at $(date '+%H:%M:%S')]"
  echo "Restarting in 5 seconds... (Ctrl+C to stop)"
  sleep 5

  RUN=$((RUN + 1))
done
