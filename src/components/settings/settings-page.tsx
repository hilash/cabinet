"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  Bell,
  Plug,
  Cpu,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Clock,
  CloudDownload,
  Palette,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UpdateSummary } from "@/components/system/update-summary";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useTheme } from "next-themes";
import {
  THEMES,
  applyTheme,
  getStoredThemeName,
  storeThemeName,
  type ThemeDefinition,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

interface ProviderInfo {
  id: string;
  name: string;
  type: "cli" | "api";
  icon: string;
  enabled: boolean;
  available: boolean;
  authenticated: boolean;
  version?: string;
  error?: string;
}

interface McpServer {
  name: string;
  command: string;
  enabled: boolean;
  env: Record<string, string>;
  description?: string;
}

interface IntegrationConfig {
  mcp_servers: Record<string, McpServer>;
  notifications: {
    browser_push: boolean;
    telegram: { enabled: boolean; bot_token: string; chat_id: string };
    slack_webhook: { enabled: boolean; url: string };
    email: { enabled: boolean; frequency: "hourly" | "daily"; to: string };
  };
  scheduling: {
    max_concurrent_agents: number;
    default_heartbeat_interval: string;
    active_hours: string;
    pause_on_error: boolean;
  };
}

type Tab = "providers" | "integrations" | "notifications" | "appearance" | "updates";

export function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProviders, setSavingProviders] = useState(false);
  const [tab, setTab] = useState<Tab>("providers");
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [activeThemeName, setActiveThemeName] = useState<string | null>(null);
  const { setTheme: setNextTheme } = useTheme();
  const {
    update,
    loading: updateLoading,
    refreshing: updateRefreshing,
    applyPending,
    backupPending,
    backupPath,
    actionError,
    refresh: refreshUpdate,
    createBackup,
    openDataDir,
    applyUpdate,
  } = useCabinetUpdate();

  // Sync active theme name on mount
  useEffect(() => {
    setActiveThemeName(getStoredThemeName() || "paper");
  }, []);

  const selectTheme = (themeDef: ThemeDefinition) => {
    applyTheme(themeDef);
    setActiveThemeName(themeDef.name);
    storeThemeName(themeDef.name);
    setNextTheme(themeDef.type);
  };

  const darkThemes = THEMES.filter((t) => t.type === "dark");
  const lightThemes = THEMES.filter((t) => t.type === "light");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setDefaultProvider(data.defaultProvider || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProviderSettings = useCallback(async (nextDefaultProvider: string, disabledProviderIds: string[]) => {
    setSavingProviders(true);
    try {
      const res = await fetch("/api/agents/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: nextDefaultProvider,
          disabledProviderIds,
        }),
      });
      if (res.ok) {
        await refresh();
      }
    } catch {
      // ignore
    } finally {
      setSavingProviders(false);
    }
  }, [refresh]);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/agents/config/integrations");
      if (res.ok) {
        setConfig(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/agents/config/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    refresh();
    loadConfig();
  }, [refresh, loadConfig]);

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateMcp = (id: string, field: string, value: unknown) => {
    if (!config) return;
    setConfig({
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        [id]: { ...config.mcp_servers[id], [field]: value },
      },
    });
  };

  const updateMcpEnv = (id: string, envKey: string, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        [id]: {
          ...config.mcp_servers[id],
          env: { ...config.mcp_servers[id].env, [envKey]: value },
        },
      },
    });
  };

  const updateNotif = (path: string, value: unknown) => {
    if (!config) return;
    const parts = path.split(".");
    const notif = { ...config.notifications } as Record<string, unknown>;
    if (parts.length === 1) {
      notif[parts[0]] = value;
    } else {
      notif[parts[0]] = { ...(notif[parts[0]] as Record<string, unknown>), [parts[1]]: value };
    }
    setConfig({ ...config, notifications: notif as IntegrationConfig["notifications"] });
  };

  const updateScheduling = (field: string, value: unknown) => {
    if (!config) return;
    setConfig({
      ...config,
      scheduling: { ...config.scheduling, [field]: value },
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "providers", label: "Providers", icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "integrations", label: "Integrations", icon: <Plug className="h-3.5 w-3.5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-3.5 w-3.5" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="h-3.5 w-3.5" /> },
    { id: "updates", label: "Updates", icon: <CloudDownload className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Settings
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {(tab === "integrations" || tab === "notifications") && (
            <Button
              variant={saved ? "default" : "outline"}
              size="sm"
              className={cn("h-7 gap-1.5 text-[12px]", saved && "bg-emerald-600 hover:bg-emerald-700 text-white")}
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : saved ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {saving ? "Saving..." : saved ? "Saved" : "Save"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[12px]"
            onClick={() => { refresh(); loadConfig(); }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-2xl">
          {/* Appearance Tab */}
          {tab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[13px] font-semibold mb-1">Theme</h3>
                <p className="text-[12px] text-muted-foreground mb-4">
                  Choose a theme for the interface.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-2">Light Themes</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {lightThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => selectTheme(t)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all",
                            activeThemeName === t.name
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div
                            className="h-4 w-4 rounded-full shrink-0 border border-[#00000015]"
                            style={{ backgroundColor: t.accent }}
                          />
                          <span
                            className={cn(
                              "text-[12px]",
                              t.name === "paper" ? "italic" : "font-medium"
                            )}
                            style={{
                              fontFamily: t.name === "paper"
                                ? "var(--font-logo), Georgia, serif"
                                : (t.headingFont || t.font),
                            }}
                          >
                            {t.label}
                          </span>
                          {activeThemeName === t.name && (
                            <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-2">Dark Themes</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {darkThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => selectTheme(t)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all",
                            activeThemeName === t.name
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div
                            className="h-4 w-4 rounded-full shrink-0 border border-[#ffffff20]"
                            style={{ backgroundColor: t.accent }}
                          />
                          <span
                            className="text-[12px] font-medium"
                            style={{ fontFamily: t.headingFont || t.font }}
                          >
                            {t.label}
                          </span>
                          {activeThemeName === t.name && (
                            <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "updates" && update && (
            <UpdateSummary
              update={update}
              loading={updateLoading}
              refreshing={updateRefreshing}
              applyPending={applyPending}
              backupPending={backupPending}
              backupPath={backupPath}
              actionError={actionError}
              onRefresh={() => {
                void refreshUpdate();
              }}
              onApply={applyUpdate}
              onCreateBackup={async () => {
                await createBackup("data");
              }}
              onOpenDataDir={openDataDir}
            />
          )}

          {tab === "updates" && !update && updateLoading && (
            <p className="text-[13px] text-muted-foreground">Checking for Cabinet updates...</p>
          )}

          {/* Providers Tab */}
          {tab === "providers" && (
            <>
              <div>
                <h3 className="text-[14px] font-semibold mb-3">Agent Providers</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure AI agent providers. CLI agents run via terminal, API agents use direct API calls.
                </p>

                {loading ? (
                  <p className="text-[13px] text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-3 rounded-lg border border-border bg-card p-3">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Default provider
                        </label>
                        <select
                          value={defaultProvider}
                          onChange={(event) => {
                            const disabledProviderIds = providers
                              .filter((provider) => !provider.enabled)
                              .map((provider) => provider.id);
                            void saveProviderSettings(event.target.value, disabledProviderIds);
                          }}
                          disabled={savingProviders}
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground"
                        >
                          {providers
                            .filter((provider) => provider.type === "cli" && provider.enabled)
                            .map((provider) => (
                              <option key={provider.id} value={provider.id}>
                                {provider.name}
                              </option>
                            ))}
                        </select>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          General conversations and fallback runs use this provider.
                        </p>
                      </div>

                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        CLI Agents
                      </h4>
                      <div className="space-y-2">
                        {providers
                          .filter((p) => p.type === "cli")
                          .map((provider) => (
                            <div
                              key={provider.id}
                              className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
                            >
                              <div className="flex items-center gap-3">
                                {provider.available ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-[13px] font-medium">{provider.name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {provider.available ? provider.version || "Ready" : provider.error || "Not installed"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                  provider.id === defaultProvider
                                    ? "bg-primary/10 text-primary"
                                    : provider.enabled
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : "bg-muted text-muted-foreground"
                                )}>
                                  {provider.id === defaultProvider
                                    ? "Default"
                                    : provider.enabled
                                      ? "Enabled"
                                      : "Disabled"}
                                </span>
                                <button
                                  onClick={() => {
                                    const nextDisabled = provider.enabled
                                      ? providers
                                          .filter((entry) => !entry.enabled || entry.id === provider.id)
                                          .map((entry) => entry.id)
                                      : providers
                                          .filter((entry) => !entry.enabled && entry.id !== provider.id)
                                          .map((entry) => entry.id);
                                    const enabledAfterToggle = providers.filter(
                                      (entry) => !nextDisabled.includes(entry.id) && entry.type === "cli"
                                    );
                                    const nextDefault =
                                      provider.id === defaultProvider && nextDisabled.includes(provider.id)
                                        ? enabledAfterToggle[0]?.id || defaultProvider
                                        : defaultProvider;
                                    void saveProviderSettings(nextDefault, nextDisabled);
                                  }}
                                  disabled={savingProviders || (provider.id === defaultProvider && providers.filter((entry) => entry.type === "cli" && entry.enabled).length <= 1)}
                                  className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                                >
                                  {provider.enabled ? "Disable" : "Enable"}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        API Agents
                      </h4>
                      <div className="space-y-2">
                        {[
                          { name: "Anthropic API", env: "ANTHROPIC_API_KEY", status: "Coming soon" },
                          { name: "OpenAI API", env: "OPENAI_API_KEY", status: "Coming soon" },
                          { name: "Google AI API", env: "GOOGLE_AI_API_KEY", status: "Coming soon" },
                        ].map((p) => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between bg-card border border-border rounded-lg p-3 opacity-50"
                          >
                            <div className="flex items-center gap-3">
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-[13px] font-medium">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground">{p.status}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-[14px] font-semibold mb-3">About</h3>
                <div className="space-y-2 text-[13px] text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Cabinet</span>{" "}
                    — AI-first Company OS
                  </p>
                  <p>Version 0.1.0</p>
                  <p className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Powered by local AI CLIs
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Integrations Tab */}
          {tab === "integrations" && config && (
            <>
              <div>
                <h3 className="text-[14px] font-semibold mb-1">MCP Servers</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure tool servers that agents can use. Enable a server and provide API credentials for agents to access external services.
                </p>

                <div className="space-y-3">
                  {Object.entries(config.mcp_servers).map(([id, server]) => (
                    <div
                      key={id}
                      className={cn(
                        "bg-card border rounded-lg p-3 transition-colors",
                        server.enabled ? "border-primary/30" : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateMcp(id, "enabled", !server.enabled)}
                            className={cn(
                              "h-4 w-8 rounded-full relative transition-colors",
                              server.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                                server.enabled ? "left-4" : "left-0.5"
                              )}
                            />
                          </button>
                          <span className="text-[13px] font-medium">{server.name}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          server.enabled
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {server.enabled ? "Active" : "Disabled"}
                        </span>
                      </div>

                      {server.description && (
                        <p className="text-[11px] text-muted-foreground mb-2">{server.description}</p>
                      )}

                      <div className="space-y-1.5">
                        <div>
                          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Command</label>
                          <input
                            type="text"
                            value={server.command}
                            onChange={(e) => updateMcp(id, "command", e.target.value)}
                            className="w-full mt-0.5 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>

                        {Object.entries(server.env).map(([envKey, envVal]) => {
                          const revealKey = `${id}.${envKey}`;
                          const isRevealed = revealedKeys.has(revealKey);
                          return (
                            <div key={envKey}>
                              <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{envKey}</label>
                              <div className="flex gap-1 mt-0.5">
                                <input
                                  type={isRevealed ? "text" : "password"}
                                  value={envVal}
                                  onChange={(e) => updateMcpEnv(id, envKey, e.target.value)}
                                  placeholder={`Enter ${envKey}...`}
                                  className="flex-1 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/30"
                                />
                                <button
                                  onClick={() => toggleReveal(revealKey)}
                                  className="px-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                                  title={isRevealed ? "Hide" : "Reveal"}
                                >
                                  {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scheduling Defaults */}
              <div className="border-t border-border pt-6">
                <h3 className="text-[14px] font-semibold mb-1">Scheduling Defaults</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure default scheduling behavior for agents and jobs.
                </p>

                <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Max Concurrent Agents</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={config.scheduling.max_concurrent_agents}
                      onChange={(e) => updateScheduling("max_concurrent_agents", parseInt(e.target.value) || 10)}
                      className="w-full mt-0.5 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Active Hours
                    </label>
                    <input
                      type="text"
                      value={config.scheduling.active_hours}
                      onChange={(e) => updateScheduling("active_hours", e.target.value)}
                      placeholder="8-22"
                      className="w-full mt-0.5 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      Agents only run heartbeats during these hours (e.g., &quot;8-22&quot; for 8 AM to 10 PM)
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-medium">Pause on Error</p>
                      <p className="text-[10px] text-muted-foreground/60">Auto-pause agents after 3 consecutive failures</p>
                    </div>
                    <button
                      onClick={() => updateScheduling("pause_on_error", !config.scheduling.pause_on_error)}
                      className={cn(
                        "h-4 w-8 rounded-full relative transition-colors",
                        config.scheduling.pause_on_error ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                          config.scheduling.pause_on_error ? "left-4" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notifications Tab */}
          {tab === "notifications" && config && (
            <>
              <div>
                <h3 className="text-[14px] font-semibold mb-1">Notification Channels</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure how you receive alerts when agents need your attention. Notifications fire for #alerts messages and @human mentions.
                </p>

                <div className="space-y-3">
                  {/* Browser Push */}
                  <div className={cn(
                    "bg-card border rounded-lg p-3 transition-colors",
                    config.notifications.browser_push ? "border-primary/30" : "border-border"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🔔</span>
                        <div>
                          <p className="text-[13px] font-medium">Browser Push</p>
                          <p className="text-[11px] text-muted-foreground">
                            Instant alerts when Cabinet tab is open or PWA installed
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotif("browser_push", !config.notifications.browser_push)}
                        className={cn(
                          "h-4 w-8 rounded-full relative transition-colors",
                          config.notifications.browser_push ? "bg-emerald-500" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                            config.notifications.browser_push ? "left-4" : "left-0.5"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Telegram */}
                  <div className={cn(
                    "bg-card border rounded-lg p-3 transition-colors",
                    config.notifications.telegram.enabled ? "border-primary/30" : "border-border"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">✈️</span>
                        <div>
                          <p className="text-[13px] font-medium">Telegram</p>
                          <p className="text-[11px] text-muted-foreground">
                            Instant mobile notifications via Telegram bot
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotif("telegram.enabled", !config.notifications.telegram.enabled)}
                        className={cn(
                          "h-4 w-8 rounded-full relative transition-colors",
                          config.notifications.telegram.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                            config.notifications.telegram.enabled ? "left-4" : "left-0.5"
                          )}
                        />
                      </button>
                    </div>

                    {config.notifications.telegram.enabled && (
                      <div className="space-y-1.5 mt-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Bot Token</label>
                          <div className="flex gap-1 mt-0.5">
                            <input
                              type={revealedKeys.has("tg.token") ? "text" : "password"}
                              value={config.notifications.telegram.bot_token}
                              onChange={(e) => updateNotif("telegram.bot_token", e.target.value)}
                              placeholder="123456:ABC-DEF..."
                              className="flex-1 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/30"
                            />
                            <button onClick={() => toggleReveal("tg.token")} className="px-1.5 text-muted-foreground/50 hover:text-foreground transition-colors">
                              {revealedKeys.has("tg.token") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Chat ID</label>
                          <input
                            type="text"
                            value={config.notifications.telegram.chat_id}
                            onChange={(e) => updateNotif("telegram.chat_id", e.target.value)}
                            placeholder="Your Telegram chat ID"
                            className="w-full mt-0.5 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slack Webhook */}
                  <div className={cn(
                    "bg-card border rounded-lg p-3 transition-colors",
                    config.notifications.slack_webhook.enabled ? "border-primary/30" : "border-border"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">💬</span>
                        <div>
                          <p className="text-[13px] font-medium">Slack Webhook</p>
                          <p className="text-[11px] text-muted-foreground">
                            Forward alerts to your team&apos;s Slack channel
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotif("slack_webhook.enabled", !config.notifications.slack_webhook.enabled)}
                        className={cn(
                          "h-4 w-8 rounded-full relative transition-colors",
                          config.notifications.slack_webhook.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                            config.notifications.slack_webhook.enabled ? "left-4" : "left-0.5"
                          )}
                        />
                      </button>
                    </div>

                    {config.notifications.slack_webhook.enabled && (
                      <div className="mt-2">
                        <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Webhook URL</label>
                        <div className="flex gap-1 mt-0.5">
                          <input
                            type={revealedKeys.has("slack.url") ? "text" : "password"}
                            value={config.notifications.slack_webhook.url}
                            onChange={(e) => updateNotif("slack_webhook.url", e.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                            className="flex-1 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/30"
                          />
                          <button onClick={() => toggleReveal("slack.url")} className="px-1.5 text-muted-foreground/50 hover:text-foreground transition-colors">
                            {revealedKeys.has("slack.url") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Email Digest */}
                  <div className={cn(
                    "bg-card border rounded-lg p-3 transition-colors",
                    config.notifications.email.enabled ? "border-primary/30" : "border-border"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📧</span>
                        <div>
                          <p className="text-[13px] font-medium">Email Digest</p>
                          <p className="text-[11px] text-muted-foreground">
                            Batched summary of alerts and agent activity
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotif("email.enabled", !config.notifications.email.enabled)}
                        className={cn(
                          "h-4 w-8 rounded-full relative transition-colors",
                          config.notifications.email.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                            config.notifications.email.enabled ? "left-4" : "left-0.5"
                          )}
                        />
                      </button>
                    </div>

                    {config.notifications.email.enabled && (
                      <div className="space-y-1.5 mt-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Email Address</label>
                          <input
                            type="email"
                            value={config.notifications.email.to}
                            onChange={(e) => updateNotif("email.to", e.target.value)}
                            placeholder="founder@company.com"
                            className="w-full mt-0.5 text-[12px] bg-muted/30 border border-border/50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/30"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Frequency</label>
                          <div className="flex gap-2 mt-1">
                            {(["hourly", "daily"] as const).map((freq) => (
                              <button
                                key={freq}
                                onClick={() => updateNotif("email.frequency", freq)}
                                className={cn(
                                  "px-3 py-1 rounded-md text-[11px] font-medium transition-colors",
                                  config.notifications.email.frequency === freq
                                    ? "bg-primary/10 text-primary border border-primary/30"
                                    : "bg-muted/30 text-muted-foreground border border-border/50 hover:border-border"
                                )}
                              >
                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Alert Rules */}
              <div className="border-t border-border pt-6">
                <h3 className="text-[14px] font-semibold mb-1">Alert Rules</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Notifications are triggered automatically for these events:
                </p>
                <div className="space-y-2">
                  {[
                    { event: "#alerts channel messages", desc: "Any agent posting to the alerts channel", active: true },
                    { event: "@human mentions", desc: "When an agent mentions @human in any channel", active: true },
                    { event: "Goal floor breached", desc: "A goal drops below its minimum threshold", active: true },
                    { event: "Agent health degraded", desc: "3+ consecutive heartbeat failures", active: true },
                  ].map((rule) => (
                    <div key={rule.event} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-[12px] font-medium">{rule.event}</p>
                        <p className="text-[10px] text-muted-foreground/60">{rule.desc}</p>
                      </div>
                      <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Always on</span>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-4 px-3 py-1.5 text-[12px] rounded-md border border-border hover:bg-muted/40 transition-colors"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/agents/config/notifications/test", { method: "POST" });
                      const data = await res.json();
                      alert(data.message);
                    } catch {
                      alert("Failed to send test notification.");
                    }
                  }}
                >
                  <Bell className="h-3 w-3 inline mr-1.5" />
                  Send Test Notification
                </button>
              </div>
            </>
          )}

          {tab === "integrations" && !config && configLoading && (
            <p className="text-[13px] text-muted-foreground">Loading configuration...</p>
          )}
          {tab === "notifications" && !config && configLoading && (
            <p className="text-[13px] text-muted-foreground">Loading configuration...</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
