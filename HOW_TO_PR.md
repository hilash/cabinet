# How to Create the Pull Request

This guide walks you through pushing your fork and creating a PR to the original Cabinet repository.

## Step 1: Push to Your GitHub Fork

### Option A: Fork via GitHub UI (Recommended)

1. Go to https://github.com/hilash/cabinet
2. Click the **Fork** button (top right)
3. This creates `https://github.com/YOUR_USERNAME/cabinet`

### Option B: Push to Your Fork

```bash
# Add your fork as remote (replace YOUR_USERNAME)
git remote add my-fork https://github.com/YOUR_USERNAME/cabinet.git

# Push the branch
git push my-fork hermes-integration
```

## Step 2: Create the Pull Request

### Via GitHub Web

1. Go to https://github.com/YOUR_USERNAME/cabinet
2. Click **Compare & pull request**
3. Set:
   - **Base repository**: `hilash/cabinet`
   - **Base branch**: `main`
   - **Head repository**: `YOUR_USERNAME/cabinet`
   - **Compare branch**: `hermes-integration`

4. Fill in the PR description (template below)

### PR Title
```
feat: Add Hermes Agent 100% compatibility
```

### PR Description Template
```markdown
## Summary
Adds full compatibility with [Hermes Agent](https://github.com/hermes-agent) as an alternative AI backend to Claude Code.

## Changes

### Core Features
- **Auto-detection**: Prefers Hermes Agent, falls back to Claude Code
- **Provider system**: Pluggable architecture for multiple AI backends
- **Environment override**: `CABINET_AI_BACKEND=hermes|claude`

### Files Changed
- `server/cabinet-daemon.ts`: Backend detection + dual CLI support
- `src/lib/agents/providers/hermes-agent.ts`: New Hermes provider
- `src/lib/agents/provider-registry.ts`: Registers Hermes as default
- `src/lib/agents/agent-manager.ts`: Uses provider registry
- `HERMES_INTEGRATION.md`: Full integration documentation
- `README.md`: Added AI Backends section
- `test-hermes-integration.sh`: Automated test suite

### Backward Compatibility
✅ Fully backward compatible - existing Cabinet installations continue to work
✅ If Hermes not installed → auto-fallback to Claude Code
✅ No breaking changes to API or data format

### Testing
```bash
./test-hermes-integration.sh
```
All tests pass: TypeScript compilation, provider registry, daemon backend detection.

### Documentation
- Full integration guide: [HERMES_INTEGRATION.md](./HERMES_INTEGRATION.md)
- Updated README with AI Backends section
- Provider interface documented

## Motivation
Hermes Agent provides:
- Multi-provider support (not just Anthropic)
- Local-first architecture
- Skills/tool system
- Profile-based agent configuration
- Cost-effective self-hosted option

## Checklist
- [x] TypeScript compiles without errors
- [x] Backward compatible with existing installations
- [x] Documentation updated
- [x] Test script included
- [x] No breaking changes
```

## Step 3: Submit PR

1. Click **Create pull request**
2. Wait for CI/tests (if enabled)
3. Respond to any reviewer feedback

## What Makes This PR Likely to Be Accepted

### ✅ Strengths of this Integration

1. **Zero Breaking Changes**: Existing users unaffected
2. **Auto-Detection**: No configuration required for users
3. **Fallback**: Graceful degradation if Hermes not installed
4. **Clean Architecture**: Provider pattern is maintainable
5. **Well Documented**: Full integration guide included
6. **Tested**: Automated test script validates changes

### 🎯 Value Proposition

For Cabinet users:
- Choice of AI backend (not locked to Claude)
- Local-first option with Hermes
- Potential cost savings
- Multi-provider flexibility

For Cabinet maintainers:
- No maintenance burden (providers are isolated)
- Growing Hermes ecosystem compatibility
- Future-proof architecture

## Post-PR Steps

After PR is merged:

1. **Update your fork's main branch**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. **Announce the integration**:
   - Hermes Agent community
   - Social media / relevant forums
   - Update any documentation

## Troubleshooting

### "Permission denied" when pushing
```bash
# Use SSH instead of HTTPS
git remote set-url my-fork git@github.com:YOUR_USERNAME/cabinet.git
```

### "Branch already exists"
```bash
# Force push (if you want to overwrite)
git push my-fork hermes-integration --force
```

### Merge conflicts
```bash
# Fetch upstream changes
git remote add upstream https://github.com/hilash/cabinet.git
git fetch upstream

# Rebase your branch
git checkout hermes-integration
git rebase upstream/main

# Push updated branch
git push my-fork hermes-integration --force
```

## Questions?

- Cabinet issues: https://github.com/hilash/cabinet/issues
- Hermes Agent: https://github.com/hermes-agent

---

**Good luck with the PR! 🚀**
