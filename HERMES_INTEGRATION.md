# Cabinet + Hermes Agent Integration

This fork adds **100% compatibility** with [Hermes Agent](https://github.com/hermes-agent) as an alternative AI backend to Claude Code.

## What Changed

### 1. Auto-Detection Backend System
The daemon now automatically detects and prefers **Hermes Agent** over Claude Code:

```typescript
// Detection priority:
1. Explicit: CABINET_AI_BACKEND=hermes|claude (env var)
2. Auto: Hermes Agent (if installed)
3. Fallback: Claude Code (if Hermes not found)
```

### 2. Dual Backend Support
- **Hermes Agent** (preferred): Uses `hermes` CLI with full tool/skill support
- **Claude Code** (fallback): Original behavior preserved

### 3. Provider System
Added new files:
- `src/lib/agents/providers/hermes-agent.ts` - Hermes provider implementation
- Updated `src/lib/agents/provider-registry.ts` - Registers Hermes as default

### 4. Agent Manager Refactoring
Updated `src/lib/agents/agent-manager.ts`:
- Uses provider registry instead of hardcoded `claude` command
- Supports profile mapping (Cabinet agent → Hermes profile)
- Provider can be specified per-run

## Installation

### Prerequisites

You need **one** of these AI agents installed:

#### Option A: Hermes Agent (Recommended)
```bash
# Official install script
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# Or from PyPI (if available)
pip install hermes-agent
```

#### Option B: Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### Cabinet Setup

```bash
# Clone this fork
git clone https://github.com/YOUR_USERNAME/cabinet-hermes-fork.git
cd cabinet-hermes-fork

# Install dependencies
npm install

# Optional: Force specific backend
export CABINET_AI_BACKEND=hermes  # or 'claude'

# Start the app
npm run dev:all
```

## Configuration

### Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `CABINET_AI_BACKEND` | `hermes` / `claude` | Force specific backend |
| `HERMES_HOME` | path | Hermes profile directory |

### Profile Mapping

Cabinet agents automatically map to Hermes profiles:

| Cabinet Agent | Hermes Profile |
|--------------|----------------|
| `general` | `default` |
| `ceo` | `ceo` |
| `editor` | `creative-playbook` |
| `content-marketer` | `growth-hacker` |

Profiles are loaded from `~/.hermes/profiles/{profile}/`.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Cabinet UI    │────▶│  Next.js API     │────▶│  cabinet-daemon │
│   (Next.js)     │     │  (provider.ts)   │     │  (server/)      │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                             │
                                    ┌────────────────────────┼────────────────────────┐
                                    │                        │                        │
                                    ▼                        ▼                        ▼
                          ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
                          │  Hermes Agent   │      │   Claude Code   │      │   Other CLI     │
                          │   (preferred)   │      │   (fallback)    │      │    (future)     │
                          └─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Testing

### Test Backend Detection
```bash
# Start daemon with debug logging
DEBUG=cabinet:* npm run dev:daemon

# Should show:
# "Found hermes at: ..."
# "Using AI backend: Hermes Agent (...)"
```

### Test Agent Execution
1. Open Cabinet UI at http://localhost:3000
2. Go to Agents → General
3. Start a new session
4. Check terminal shows Hermes prompt (╭─)

### Verify Provider Health
```bash
curl http://localhost:3000/api/providers/health
# Should return: { "hermes-agent": { "available": true, ... } }
```

## Migration from Original Cabinet

This fork is **fully backward compatible**:
- If Hermes is not installed → uses Claude Code
- All existing Cabinet features preserved
- No changes needed to existing agents/knowledge base

## Contributing

### Adding New Providers

1. Create provider in `src/lib/agents/providers/{name}.ts`
2. Implement `AgentProvider` interface
3. Register in `src/lib/agents/provider-registry.ts`
4. Add detection logic in `server/cabinet-daemon.ts`

### Provider Interface
```typescript
export interface AgentProvider {
  id: string;
  name: string;
  type: "cli" | "api";
  icon: string;
  command?: string;
  buildArgs?(prompt: string, workdir: string, profile?: string): string[];
  isAvailable(): Promise<boolean>;
  healthCheck(): Promise<ProviderStatus>;
}
```

## Troubleshooting

### "No AI agent backend found!"
```bash
# Check if hermes is installed
which hermes
hermes --version

# If not found, install:
pip install hermes-agent
```

### "Hermes not detected but it's installed"
```bash
# Check PATH includes hermes location
export PATH="$HOME/.local/bin:$PATH"

# Or force specific path
export CABINET_AI_BACKEND=hermes
```

### "Provider shows unavailable"
```bash
# Test provider directly
hermes --version  # Should output version
claude --version  # Should output version
```

## Credits

- Original Cabinet: [hilash/cabinet](https://github.com/hilash/cabinet)
- Hermes Agent: [hermes-agent](https://github.com/hermes-agent)
- This integration: Maintained by Hermes Agent team

## License

MIT - Same as original Cabinet project.
