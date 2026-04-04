#!/bin/bash
# Test script for Hermes Agent integration in Cabinet

set -e

echo "======================================"
echo "Cabinet + Hermes Integration Tests"
echo "======================================"
echo ""

# Test 1: TypeScript compilation
echo "Test 1: TypeScript compilation"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo "❌ FAIL: TypeScript compilation errors found"
    npx tsc --noEmit 2>&1 | head -10
    exit 1
else
    echo "✅ PASS: TypeScript compiles without errors"
fi
echo ""

# Test 2: Provider file exists
echo "Test 2: Hermes provider file exists"
if [ -f "src/lib/agents/providers/hermes-agent.ts" ]; then
    echo "✅ PASS: hermes-agent.ts exists"
else
    echo "❌ FAIL: hermes-agent.ts not found"
    exit 1
fi
echo ""

# Test 3: Provider registry updated
echo "Test 3: Provider registry includes Hermes"
if grep -q "hermesAgentProvider" src/lib/agents/provider-registry.ts; then
    echo "✅ PASS: Hermes provider registered"
else
    echo "❌ FAIL: Hermes provider not registered"
    exit 1
fi
echo ""

# Test 4: Agent manager uses provider registry
echo "Test 4: Agent manager uses provider registry"
if grep -q "providerRegistry" src/lib/agents/agent-manager.ts; then
    echo "✅ PASS: Agent manager uses provider registry"
else
    echo "❌ FAIL: Agent manager not updated"
    exit 1
fi
echo ""

# Test 5: Daemon has backend detection
echo "Test 5: Daemon has backend detection"
if grep -q "detectBackend" server/cabinet-daemon.ts; then
    echo "✅ PASS: Backend detection implemented"
else
    echo "❌ FAIL: Backend detection not found"
    exit 1
fi
echo ""

# Test 6: Documentation exists
echo "Test 6: Integration documentation"
if [ -f "HERMES_INTEGRATION.md" ]; then
    echo "✅ PASS: HERMES_INTEGRATION.md exists"
else
    echo "❌ FAIL: Documentation not found"
    exit 1
fi
echo ""

# Test 7: Hermes CLI arguments are correct
echo "Test 7: Hermes CLI arguments validation"
# Check that we're using -q for prompt, not -p
if grep -q 'args.push("-q", prompt)' src/lib/agents/providers/hermes-agent.ts && \
   ! grep -q 'args.push("-p", prompt)' src/lib/agents/providers/hermes-agent.ts; then
  echo "✅ PASS: Hermes provider uses -q for prompt (not -p)"
else
  echo "❌ FAIL: Hermes provider has incorrect argument structure"
  exit 1
fi

# Check daemon also uses correct arguments
if grep -q 'args.push("-q", prompt)' server/cabinet-daemon.ts; then
  echo "✅ PASS: Daemon uses -q for Hermes prompt"
else
  echo "❌ FAIL: Daemon has incorrect Hermes arguments"
  exit 1
fi

# Verify Claude still uses -p (it should)
if grep -A10 'type: "claude"' server/cabinet-daemon.ts | grep -q 'args.push("-p", prompt)'; then
  echo "✅ PASS: Claude Code still uses -p for prompt (correct)"
else
  echo "⚠️  WARNING: Could not verify Claude argument structure"
fi
echo ""

echo "======================================"
echo "All tests passed! ✅"
echo "======================================"
echo ""
echo "Summary:"
echo "- TypeScript compilation: OK"
echo "- Hermes provider: OK"
echo "- Provider registry: OK"
echo "- Agent manager: OK"
echo "- Daemon backend: OK"
echo "- Documentation: OK"
echo "- CLI arguments validated: OK"
echo ""
echo "Next steps:"
echo "1. Push branch: git push origin hermes-integration"
echo "2. Create PR to upstream: hilash/cabinet"
echo "3. Test with actual Hermes Agent installation"
