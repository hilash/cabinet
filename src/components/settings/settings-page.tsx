"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
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
  Info,
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
import type { ProviderInfo } from "@/types/agents";

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

type Tab = "providers" | "integrations" | "notifications" | "appearance" | "updates" | "about";

export function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProviders, setSavingProviders] = useState(false);
  const VALID_TABS: Tab[] = ["providers", "integrations", "notifications", "appearance", "updates", "about"];
  const initialTab = (() => {
    const slug = useAppStore.getState().section.slug as Tab | undefined;
    return slug && VALID_TABS.includes(slug) ? slug : "providers";
  })();
  const [tab, setTabState] = useState<Tab>(initialTab);
  const initializedRef = useRef(false);

  // Sync tab changes to hash
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    useAppStore.getState().setSection({ type: "settings", slug: t });
  }, []);

  // Listen for external hash changes (browser back/forward)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Set hash on first render if it's just #/settings
      if (!useAppStore.getState().section.slug) {
        useAppStore.getState().setSection({ type: "settings", slug: tab });
      }
    }
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.section.type === "settings" && state.section.slug !== prev.section.slug) {
        const slug = state.section.slug as Tab | undefined;
        if (slug && VALID_TABS.includes(slug)) {
          setTabState(slug);
        }
      }
    });
    return unsub;
  }, []);
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

  const saveProviderSettings = useCallback(async (
    nextDefaultProvider: string,
    disabledProviderIds: string[],
    migrations: Array<{ fromProviderId: string; toProviderId: string }> = []
  ) => {
    setSavingProviders(true);
    try {
      const res = await fetch("/api/agents/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: nextDefaultProvider,
          disabledProviderIds,
          migrations,
        }),
      });
      if (res.ok) {
        await refresh();
        return true;
      }

      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.conflicts) {
        const message = (data.conflicts as Array<{
          providerId: string;
          agentSlugs: string[];
          jobs: Array<{ jobName: string }>;
          suggestedProviderId: string;
        }>).map((conflict) =>
          `${conflict.providerId}: ${conflict.agentSlugs.length} agents, ${conflict.jobs.length} jobs`
        ).join("\n");
        window.alert(`Provider disable blocked until assignments are migrated:\n${message}`);
      }
    } catch {
      // ignore
    } finally {
      setSavingProviders(false);
    }
    return false;
  }, [refresh]);

  const getProviderName = (providerId: string) =>
    providers.find((provider) => provider.id === providerId)?.name || providerId;

  const describeProviderUsage = (provider: ProviderInfo) => {
    const parts: string[] = [];
    if ((provider.usage?.agentCount ?? 0) > 0) {
      parts.push(`${provider.usage!.agentCount} agent${provider.usage!.agentCount === 1 ? "" : "s"}`);
    }
    if ((provider.usage?.jobCount ?? 0) > 0) {
      parts.push(`${provider.usage!.jobCount} job${provider.usage!.jobCount === 1 ? "" : "s"}`);
    }
    return parts.join(", ");
  };

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
    { id: "about", label: "About", icon: <Info className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border transition-[padding] duration-200"
        style={{ paddingLeft: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Settings
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
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

      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
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
                                  {(provider.usage?.totalCount ?? 0) > 0 && (
                                    <p className="text-[11px] text-muted-foreground">
                                      In use by {describeProviderUsage(provider)}
                                    </p>
                                  )}
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
                                  onClick={async () => {
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
                                    const migrations =
                                      provider.enabled && (provider.usage?.totalCount ?? 0) > 0
                                        ? [{ fromProviderId: provider.id, toProviderId: nextDefault }]
                                        : [];

                                    if (provider.enabled && (provider.usage?.totalCount ?? 0) > 0) {
                                      const confirmed = window.confirm(
                                        `Disable ${provider.name} and migrate ${describeProviderUsage(provider)} to ${getProviderName(nextDefault)}?`
                                      );
                                      if (!confirmed) return;
                                    }

                                    await saveProviderSettings(nextDefault, nextDisabled, migrations);
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

            </>
          )}

          {/* Integrations Tab */}
          {tab === "integrations" && (
            <div className="relative">
              {/* Blurred content preview */}
              <div className="pointer-events-none select-none blur-[2px] opacity-70" aria-hidden="true">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">MCP Servers</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Configure tool servers that agents can use. Enable a server and provide API credentials for agents to access external services.
                  </p>
                  <div className="space-y-3">
                    {["Brave Search", "GitHub", "Slack"].map((name) => (
                      <div key={name} className="bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-8 rounded-full bg-muted-foreground/30 relative">
                              <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white" />
                            </div>
                            <span className="text-[13px] font-medium">{name}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Disabled</span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Command</label>
                            <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">API Key</label>
                            <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6 mt-6">
                  <h3 className="text-[14px] font-semibold mb-1">Scheduling Defaults</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Configure default scheduling behavior for agents and jobs.
                  </p>
                  <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Max Concurrent Agents</label>
                      <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Active Hours
                      </label>
                      <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coming Soon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-background/80 backdrop-blur-sm rounded-xl px-8 py-6 border border-border shadow-lg">
                  <Plug className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-[13px] font-semibold">Coming Soon</span>
                  <p className="text-[12px] text-muted-foreground text-center max-w-[220px]">
                    MCP servers, scheduling, and third-party integrations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === "notifications" && (
            <div className="relative">
              {/* Blurred content preview */}
              <div className="pointer-events-none select-none blur-[2px] opacity-70" aria-hidden="true">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">Notification Channels</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Configure how you receive alerts when agents need your attention.
                  </p>
                  <div className="space-y-3">
                    {[
                      { icon: "🔔", name: "Browser Push", desc: "Instant alerts when Cabinet tab is open or PWA installed" },
                      { icon: "✈️", name: "Telegram", desc: "Instant mobile notifications via Telegram bot" },
                      { icon: "💬", name: "Slack Webhook", desc: "Forward alerts to your team's Slack channel" },
                      { icon: "📧", name: "Email Digest", desc: "Batched summary of alerts and agent activity" },
                    ].map((ch) => (
                      <div key={ch.name} className="bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{ch.icon}</span>
                            <div>
                              <p className="text-[13px] font-medium">{ch.name}</p>
                              <p className="text-[11px] text-muted-foreground">{ch.desc}</p>
                            </div>
                          </div>
                          <div className="h-4 w-8 rounded-full bg-muted-foreground/30 relative">
                            <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6 mt-6">
                  <h3 className="text-[14px] font-semibold mb-1">Alert Rules</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Notifications are triggered automatically for these events:
                  </p>
                  <div className="space-y-2">
                    {[
                      { event: "#alerts channel messages", desc: "Any agent posting to the alerts channel" },
                      { event: "@human mentions", desc: "When an agent mentions @human in any channel" },
                      { event: "Goal floor breached", desc: "A goal drops below its minimum threshold" },
                      { event: "Agent health degraded", desc: "3+ consecutive heartbeat failures" },
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
                </div>
              </div>

              {/* Coming Soon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-background/80 backdrop-blur-sm rounded-xl px-8 py-6 border border-border shadow-lg">
                  <Bell className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-[13px] font-semibold">Coming Soon</span>
                  <p className="text-[12px] text-muted-foreground text-center max-w-[220px]">
                    Browser push, Telegram, Slack, and email notifications.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {tab === "about" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold mb-1">Cabinet</h3>
                <p className="text-[12px] text-muted-foreground">
                  AI-first self-hosted knowledge base and startup OS.
                </p>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono">0.2.6</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Framework</span>
                  <span>Next.js (App Router)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Storage</span>
                  <span>Local filesystem</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">AI</span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Powered by local AI CLIs
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[12px] text-muted-foreground">
                  All content lives as markdown files on disk. Humans define intent. Agents do the work. The knowledge base is the shared memory between both.
                </p>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-[14px] font-semibold mb-1">Connect</h3>
                <p className="text-[12px] text-muted-foreground mb-3">
                  Get help, share feedback, or just say hi.
                </p>
                <div className="space-y-2">
                  <a
                    href="https://discord.gg/runcabinet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-[13px] font-medium hover:bg-primary/10 transition-colors"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    Join the Discord
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Recommended</span>
                  </a>
                  <a
                    href="mailto:hi@runcabinet.com"
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-[13px] text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    hi@runcabinet.com
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
