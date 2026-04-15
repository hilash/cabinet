#!/bin/bash
# Multica daemon heartbeat — keeps runtimes online
# Sends heartbeat every 10s (threshold is 45s = miss 3 times)

PAT="mul_8ffe8a61758687cd5bbcfe18d9d30ed9f9a59bbf"
RT_CLAUDE="6fd6f0f6-7e5c-46aa-91d4-95dd32abd36b"
RT_CODEX="67ea29f6-3b8f-4cc9-a2a3-c0f2da68d7f1"

while true; do
  MPORT=$(lsof -Pan -i 2>/dev/null | grep "multica-s.*LISTEN" | awk '{print $9}' | sed 's/.*://' | head -1)
  if [ -n "$MPORT" ]; then
    curl -s -X POST "http://[::1]:${MPORT}/api/daemon/heartbeat" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d "{\"runtime_id\":\"$RT_CLAUDE\"}" > /dev/null 2>&1
    curl -s -X POST "http://[::1]:${MPORT}/api/daemon/heartbeat" \
      -H "Authorization: Bearer $PAT" \
      -H "Content-Type: application/json" \
      -d "{\"runtime_id\":\"$RT_CODEX\"}" > /dev/null 2>&1
  fi
  sleep 10
done
