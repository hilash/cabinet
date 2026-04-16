"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatEffortName,
  getModelEffortLevels,
  resolveProviderEffort,
  resolveProviderModel,
} from "@/lib/agents/runtime-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getDefaultAdapterTypeForProviderInfo } from "@/lib/agents/adapter-options";
import type { ConversationRuntimeOverride } from "@/types/conversations";
import type {
  ProviderEffortLevel,
  ProviderInfo,
  ProviderModel,
} from "@/types/agents";

export type TaskRuntimeSelection = ConversationRuntimeOverride;

interface ProvidersResponse {
  providers?: ProviderInfo[];
  defaultProvider?: string | null;
  defaultModel?: string | null;
  defaultEffort?: string | null;
}

const AUTO_EFFORT_ID = "__auto__";

const EFFORT_TONES: Record<
  string,
  {
    header: string;
    bg: string;
    line: string;
    dot: string;
    selected: string;
    selectedDot: string;
    focus: string;
    idle: string;
  }
> = {
  [AUTO_EFFORT_ID]: {
    header: "text-slate-600",
    bg: "bg-slate-100 border border-slate-200",
    line: "bg-slate-400",
    dot: "bg-slate-500",
    selected: "border-slate-600 bg-slate-100 shadow-[0_0_0_1px_rgba(71,85,105,0.24)]",
    selectedDot: "bg-slate-700",
    focus: "focus-visible:ring-slate-400/80",
    idle: "border-slate-300 hover:border-slate-400",
  },
  none: {
    header: "text-slate-600",
    bg: "bg-slate-100 border border-slate-200",
    line: "bg-slate-400",
    dot: "bg-slate-500",
    selected: "border-slate-600 bg-slate-100 shadow-[0_0_0_1px_rgba(71,85,105,0.24)]",
    selectedDot: "bg-slate-700",
    focus: "focus-visible:ring-slate-400/80",
    idle: "border-slate-300 hover:border-slate-400",
  },
  minimal: {
    header: "text-yellow-700",
    bg: "bg-yellow-50 border border-yellow-200",
    line: "bg-yellow-400",
    dot: "bg-yellow-500",
    selected: "border-yellow-600 bg-yellow-50 shadow-[0_0_0_1px_rgba(234,179,8,0.26)]",
    selectedDot: "bg-yellow-600",
    focus: "focus-visible:ring-yellow-400/80",
    idle: "border-yellow-300 hover:border-yellow-400",
  },
  low: {
    header: "text-amber-700",
    bg: "bg-amber-50 border border-amber-200",
    line: "bg-amber-400",
    dot: "bg-amber-500",
    selected: "border-amber-600 bg-amber-50 shadow-[0_0_0_1px_rgba(245,158,11,0.26)]",
    selectedDot: "bg-amber-600",
    focus: "focus-visible:ring-amber-400/80",
    idle: "border-amber-300 hover:border-amber-400",
  },
  medium: {
    header: "text-orange-700",
    bg: "bg-orange-50 border border-orange-200",
    line: "bg-orange-400",
    dot: "bg-orange-500",
    selected: "border-orange-600 bg-orange-50 shadow-[0_0_0_1px_rgba(249,115,22,0.28)]",
    selectedDot: "bg-orange-600",
    focus: "focus-visible:ring-orange-400/80",
    idle: "border-orange-300 hover:border-orange-400",
  },
  high: {
    header: "text-emerald-700",
    bg: "bg-emerald-50 border border-emerald-200",
    line: "bg-emerald-400",
    dot: "bg-emerald-500",
    selected: "border-emerald-600 bg-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.26)]",
    selectedDot: "bg-emerald-600",
    focus: "focus-visible:ring-emerald-400/80",
    idle: "border-emerald-300 hover:border-emerald-400",
  },
  xhigh: {
    header: "text-rose-700",
    bg: "bg-rose-50 border border-rose-200",
    line: "bg-rose-400",
    dot: "bg-rose-500",
    selected: "border-rose-600 bg-rose-50 shadow-[0_0_0_1px_rgba(244,63,94,0.26)]",
    selectedDot: "bg-rose-600",
    focus: "focus-visible:ring-rose-400/80",
    idle: "border-rose-300 hover:border-rose-400",
  },
  max: {
    header: "text-red-700",
    bg: "bg-red-50 border border-red-200",
    line: "bg-red-400",
    dot: "bg-red-500",
    selected: "border-red-600 bg-red-50 shadow-[0_0_0_1px_rgba(239,68,68,0.28)]",
    selectedDot: "bg-red-600",
    focus: "focus-visible:ring-red-400/80",
    idle: "border-red-300 hover:border-red-400",
  },
};

function getEffortTone(id?: string) {
  if (!id) return EFFORT_TONES[AUTO_EFFORT_ID];
  return EFFORT_TONES[id.toLowerCase()] || EFFORT_TONES[AUTO_EFFORT_ID];
}

function isProviderReady(provider: ProviderInfo): boolean {
  return (
    (provider.enabled ?? true) &&
    provider.available &&
    (provider.authenticated ?? true)
  );
}

function getSelectableProviders(providers: ProviderInfo[]): ProviderInfo[] {
  const enabled = providers.filter((provider) => provider.enabled ?? true);
  const ready = enabled.filter(isProviderReady);
  if (ready.length > 0) return ready;
  if (enabled.length > 0) return enabled;
  return providers;
}

function resolveSelectedProvider(
  providers: ProviderInfo[],
  providerId?: string,
  fallbackProviderId?: string | null
): ProviderInfo | undefined {
  const selectable = getSelectableProviders(providers);
  return (
    selectable.find((provider) => provider.id === providerId) ||
    selectable.find((provider) => provider.id === fallbackProviderId) ||
    selectable[0] ||
    providers.find((provider) => provider.id === providerId) ||
    providers.find((provider) => provider.id === fallbackProviderId)
  );
}

function resolveSelectedModel(
  provider: ProviderInfo | undefined,
  requestedModel?: string,
  fallbackModel?: string | null
): ProviderModel | undefined {
  return resolveProviderModel(provider, requestedModel, fallbackModel);
}

function hasExplicitRuntimeSelection(value: TaskRuntimeSelection): boolean {
  return Boolean(
    value.providerId ||
      value.adapterType ||
      value.model ||
      value.effort
  );
}

function getProviderEffortColumns(
  provider: ProviderInfo | undefined
): ProviderEffortLevel[] {
  if (!provider) return [];

  const seen = new Set<string>();
  const columns: ProviderEffortLevel[] = [];

  const pushLevels = (levels?: ProviderEffortLevel[]) => {
    for (const level of levels || []) {
      if (seen.has(level.id)) continue;
      seen.add(level.id);
      columns.push(level);
    }
  };

  pushLevels(provider.effortLevels);
  for (const model of provider.models || []) {
    pushLevels(model.effortLevels);
  }

  return columns;
}

function normalizeSelection(
  value: TaskRuntimeSelection,
  providers: ProviderInfo[],
  defaultProviderId?: string | null,
  defaultModel?: string | null,
  defaultEffort?: string | null
): TaskRuntimeSelection {
  const selectedProvider = resolveSelectedProvider(
    providers,
    value.providerId,
    defaultProviderId
  );
  const selectedModel = resolveSelectedModel(
    selectedProvider,
    value.model,
    selectedProvider?.id === defaultProviderId ? defaultModel : undefined
  );
  const allowDefaultEffortFallback = !hasExplicitRuntimeSelection(value);
  const selectedEffort = resolveProviderEffort(
    selectedProvider,
    selectedModel?.id,
    value.effort,
    allowDefaultEffortFallback && selectedProvider?.id === defaultProviderId
      ? defaultEffort
      : undefined
  );

  return {
    providerId: selectedProvider?.id,
    adapterType: getDefaultAdapterTypeForProviderInfo(
      providers,
      selectedProvider?.id,
      defaultProviderId
    ),
    model: selectedModel?.id,
    effort: value.effort
      ? selectedEffort?.id
      : allowDefaultEffortFallback
        ? selectedEffort?.id
        : undefined,
  };
}

function sameSelection(
  left: TaskRuntimeSelection,
  right: TaskRuntimeSelection
): boolean {
  return (
    (left.providerId || "") === (right.providerId || "") &&
    (left.adapterType || "") === (right.adapterType || "") &&
    (left.model || "") === (right.model || "") &&
    (left.effort || "") === (right.effort || "")
  );
}

function ProviderGlyph({
  icon,
  className,
}: {
  icon?: string;
  className?: string;
}) {
  if (icon === "sparkles") {
    return (
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Claude_AI_symbol.svg"
        alt="Claude"
        className={className}
      />
    );
  }
  if (icon === "bot") {
    return (
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/960px-OpenAI_logo_2025_%28symbol%29.svg.png?_=20250205041901"
        alt="OpenAI"
        className={className}
      />
    );
  }
  return <Bot className={className} />;
}

function SelectionRadio({
  checked,
  label,
  onSelect,
  toneId,
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
  toneId?: string;
}) {
  const tone = getEffortTone(toneId);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "inline-flex size-[22px] items-center justify-center rounded-full border-[2.5px] transition-[border-color,background-color,box-shadow] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1",
        tone.focus,
        checked
          ? tone.selected
          : cn("bg-background", tone.idle)
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect();
      }}
    >
      <span
        className={cn(
          "size-[9px] rounded-full transition-transform",
          checked ? cn("scale-100", tone.selectedDot) : "scale-0 bg-transparent"
        )}
      />
    </button>
  );
}

function ProviderRuntimeMatrix({
  provider,
  currentProviderId,
  currentModelId,
  selectedEffortId,
  onSelect,
}: {
  provider: ProviderInfo;
  currentProviderId?: string;
  currentModelId?: string;
  selectedEffortId?: string;
  onSelect: (modelId: string, effortId?: string) => void;
}) {
  const matrixEffortColumns = getProviderEffortColumns(provider);
  const models = provider.models || [];

  if (models.length === 0) {
    return (
      <div className="px-3 py-5 text-center text-[10px] text-muted-foreground">
        No models are available for this provider yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div
          role="radiogroup"
          aria-label={`Task runtime matrix for ${provider.name}`}
          className="min-w-max"
        >
          <table className="w-full border-collapse text-[9px]">
            <thead className="bg-muted/25">
              <tr>
                <th className="min-w-[9.5rem] px-2.5 py-1.5 text-left font-medium text-foreground">
                  Model
                </th>
                {[{ id: AUTO_EFFORT_ID, name: "Auto" }, ...matrixEffortColumns].map(
                  (effort) => {
                    const tone = getEffortTone(effort.id);
                    const label =
                      effort.id === AUTO_EFFORT_ID
                        ? "Auto"
                        : formatEffortName(effort.name) || effort.name;

                    return (
                      <th
                        key={effort.id}
                        className="min-w-[3.1rem] px-1 py-1 text-center"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              "text-[8.5px] font-semibold",
                              tone.header
                            )}
                          >
                            {label}
                          </span>
                          <span className="flex w-full items-center gap-1">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                tone.dot
                              )}
                            />
                            <span
                              className={cn(
                                "h-0.5 flex-1 rounded-full",
                                tone.line
                              )}
                            />
                          </span>
                        </div>
                      </th>
                    );
                  }
                )}
              </tr>
            </thead>
            <tbody>
              {models.map((model) => {
                const modelEfforts = getModelEffortLevels(provider, model.id);
                const isCurrentModel =
                  currentProviderId === provider.id && currentModelId === model.id;

                return (
                  <tr
                    key={model.id}
                    className={cn(
                      "border-t border-border/60",
                      isCurrentModel && "bg-muted/20"
                    )}
                  >
                    <td className="px-2.5 py-1.5 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-medium text-foreground">
                          {model.name}
                        </span>
                        {model.description ? (
                          <span className="max-w-[11rem] text-[9px] leading-3.5 text-muted-foreground">
                            {model.description}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-1 py-1 text-center align-middle">
                      <SelectionRadio
                        checked={isCurrentModel && !selectedEffortId}
                        label={`${model.name}, default effort`}
                        toneId={AUTO_EFFORT_ID}
                        onSelect={() => onSelect(model.id)}
                      />
                    </td>

                    {matrixEffortColumns.map((effort) => {
                      const available = modelEfforts.some(
                        (item) => item.id === effort.id
                      );
                      const checked =
                        isCurrentModel && selectedEffortId === effort.id;

                      return (
                        <td
                          key={`${model.id}:${effort.id}`}
                          className="px-1 py-1 text-center align-middle"
                        >
                          {available ? (
                            <SelectionRadio
                              checked={checked}
                              label={`${model.name}, ${effort.name}`}
                              toneId={effort.id}
                              onSelect={() => onSelect(model.id, effort.id)}
                            />
                          ) : (
                            <span className="text-muted-foreground/35">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/15 px-2.5 py-1.5 text-[8px] text-muted-foreground">
        Auto uses the model default. Radios only appear where that effort is
        supported.
      </div>
    </>
  );
}

export function TaskRuntimePicker({
  value,
  onChange,
  align = "start",
  className,
}: {
  value: TaskRuntimeSelection;
  onChange: (value: TaskRuntimeSelection) => void;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [defaultEffort, setDefaultEffort] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/agents/providers");
        if (!response.ok) return;
        const data = (await response.json()) as ProvidersResponse;
        if (cancelled) return;
        setProviders((data.providers || []) as ProviderInfo[]);
        setDefaultProviderId(
          typeof data.defaultProvider === "string" ? data.defaultProvider : null
        );
        setDefaultModel(
          typeof data.defaultModel === "string" ? data.defaultModel : null
        );
        setDefaultEffort(
          typeof data.defaultEffort === "string" ? data.defaultEffort : null
        );
      } catch {
        if (!cancelled) {
          setProviders([]);
          setDefaultProviderId(null);
          setDefaultModel(null);
          setDefaultEffort(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedValue = useMemo(
    () =>
      providers.length > 0
        ? normalizeSelection(
            value,
            providers,
            defaultProviderId,
            defaultModel,
            defaultEffort
          )
        : value,
    [defaultEffort, defaultModel, defaultProviderId, providers, value]
  );

  const appDefaultSelection = useMemo(
    () =>
      providers.length > 0
        ? normalizeSelection(
            {},
            providers,
            defaultProviderId,
            defaultModel,
            defaultEffort
          )
        : {},
    [defaultEffort, defaultModel, defaultProviderId, providers]
  );

  useEffect(() => {
    if (providers.length === 0) return;
    if (!sameSelection(value, normalizedValue)) {
      onChange(normalizedValue);
    }
  }, [normalizedValue, onChange, providers.length, value]);

  const selectableProviders = useMemo(
    () => getSelectableProviders(providers),
    [providers]
  );

  const currentProvider = useMemo(
    () =>
      resolveSelectedProvider(
        providers,
        normalizedValue.providerId,
        defaultProviderId
      ),
    [defaultProviderId, normalizedValue.providerId, providers]
  );

  const currentModel = useMemo(
    () =>
      resolveSelectedModel(
        currentProvider,
        normalizedValue.model,
        currentProvider?.id === defaultProviderId ? defaultModel : undefined
      ),
    [currentProvider, defaultModel, defaultProviderId, normalizedValue.model]
  );

  const currentEffort = useMemo(
    () =>
      resolveProviderEffort(
        currentProvider,
        currentModel?.id,
        normalizedValue.effort,
        undefined
      ),
    [currentModel?.id, currentProvider, normalizedValue.effort]
  );

  const appDefaultProvider = useMemo(
    () =>
      resolveSelectedProvider(
        providers,
        appDefaultSelection.providerId,
        defaultProviderId
      ),
    [appDefaultSelection.providerId, defaultProviderId, providers]
  );

  const appDefaultModelInfo = useMemo(
    () =>
      resolveSelectedModel(
        appDefaultProvider,
        appDefaultSelection.model,
        appDefaultProvider?.id === defaultProviderId ? defaultModel : undefined
      ),
    [
      appDefaultProvider,
      appDefaultSelection.model,
      defaultModel,
      defaultProviderId,
    ]
  );

  useEffect(() => {
    if (!open) return;
    const nextProviderId =
      resolveSelectedProvider(
        selectableProviders,
        normalizedValue.providerId,
        defaultProviderId
      )?.id ||
      null;
    setActiveProviderId(nextProviderId);
  }, [
    defaultProviderId,
    normalizedValue.providerId,
    open,
    selectableProviders,
  ]);

  const activeProviderIdValue = useMemo(
    () =>
      resolveSelectedProvider(
        selectableProviders,
        activeProviderId || normalizedValue.providerId,
        defaultProviderId
      )?.id,
    [
      activeProviderId,
      defaultProviderId,
      normalizedValue.providerId,
      selectableProviders,
    ]
  );

  const selectionSummary = currentProvider
    ? [
        currentModel?.name || currentProvider.name,
        currentEffort?.name ||
          (normalizedValue.effort
            ? formatEffortName(normalizedValue.effort)
            : "Default"),
        currentProvider.name,
      ]
        .filter(Boolean)
        .join(" · ")
    : loading
      ? "Loading providers..."
      : "No providers available";

  const triggerTitle = currentProvider
    ? `Task model: ${selectionSummary}`
    : "Task model";

  function applySelection(
    providerId: string,
    modelId?: string,
    effortId?: string
  ) {
    onChange(
      normalizeSelection(
        {
          providerId,
          model: modelId,
          effort: effortId,
        },
        providers,
        defaultProviderId,
        defaultModel,
        defaultEffort
      )
    );
    setOpen(false);
  }

  function resetToDefault() {
    onChange(appDefaultSelection);
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        aria-label={triggerTitle}
        title={triggerTitle}
        disabled={loading && providers.length === 0}
      >
        {currentProvider ? (
          <>
            <div className="flex size-4 shrink-0 items-center justify-center rounded border border-border/60 bg-muted/30">
              <ProviderGlyph icon={currentProvider.icon} className="h-2.5 w-2.5" />
            </div>
            <span className={cn("text-[11px] font-medium", getEffortTone(normalizedValue.effort ?? AUTO_EFFORT_ID).header)}>
              {currentModel?.name || currentProvider.name}
            </span>
            <span className="text-[9px] text-muted-foreground/40">·</span>
            <span className={cn("text-[9px] font-medium", getEffortTone(normalizedValue.effort ?? AUTO_EFFORT_ID).header)}>
              {currentEffort?.name || (normalizedValue.effort ? formatEffortName(normalizedValue.effort) : "Auto")}
            </span>
          </>
        ) : (
          <BrainCircuit className="h-4 w-4" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="w-[min(32rem,calc(100vw-1rem))] min-w-[17rem] max-w-[calc(100vw-1rem)] p-0"
      >
        <DropdownMenuGroup>
          <div className={cn("mx-1.5 mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2", getEffortTone(normalizedValue.effort ?? AUTO_EFFORT_ID).bg)}>
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Selected Model
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {currentProvider ? (
                <>
                  <div className="flex size-5 shrink-0 items-center justify-center rounded border border-border/70 bg-background text-muted-foreground">
                    <ProviderGlyph
                      icon={currentProvider.icon}
                      className="h-2.5 w-2.5"
                    />
                  </div>
                  <span className={cn("truncate text-[11px] font-medium", getEffortTone(normalizedValue.effort ?? AUTO_EFFORT_ID).header)}>
                    {currentModel?.name || currentProvider.name}
                  </span>
                  <span className="shrink-0 text-[9px] text-muted-foreground/50">·</span>
                  <span className={cn("shrink-0 text-[9px] font-medium", getEffortTone(normalizedValue.effort ?? AUTO_EFFORT_ID).header)}>
                    {currentEffort?.name ||
                      (normalizedValue.effort
                        ? formatEffortName(normalizedValue.effort)
                        : "Auto")}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">{selectionSummary}</span>
              )}
            </div>

            <button
              type="button"
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-medium transition-colors",
                sameSelection(normalizedValue, appDefaultSelection)
                  ? "border-foreground/20 bg-accent text-accent-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              )}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                resetToDefault();
              }}
              title={[
                appDefaultModelInfo?.name || "Default model",
                appDefaultSelection.effort
                  ? formatEffortName(appDefaultSelection.effort)
                  : "Auto",
                appDefaultProvider?.name || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              {sameSelection(normalizedValue, appDefaultSelection) ? "App default" : "Select app default"}
            </button>
          </div>
        </DropdownMenuGroup>

        <div>
          {selectableProviders.length > 0 ? (
            <Tabs
              value={activeProviderIdValue}
              onValueChange={setActiveProviderId}
              className="gap-0"
            >
              <div className="overflow-hidden border-x border-b border-border/70">
                <div className="px-1.5 pt-1.5">
                  <TabsList
                    variant="line"
                    aria-label="Task providers"
                    className="h-auto w-full justify-start gap-1.5 rounded-none bg-transparent p-0"
                  >
                    {selectableProviders.map((provider) => (
                      <TabsTrigger
                        key={provider.id}
                        value={provider.id}
                        className="relative -mb-px h-7 flex-none gap-1.5 rounded-t-md rounded-b-none border-0 !bg-background px-2.5 py-1 text-[9px] font-medium text-muted-foreground shadow-none after:hidden hover:text-foreground data-active:z-10 data-active:!bg-background data-active:text-foreground data-active:shadow-none"
                      >
                        <ProviderGlyph
                          icon={provider.icon}
                          className="h-3 w-3"
                        />
                        <span>{provider.name}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {selectableProviders.map((provider) => (
                  <TabsContent
                    key={provider.id}
                    value={provider.id}
                    className="mt-0 bg-background"
                  >
                    <ProviderRuntimeMatrix
                      provider={provider}
                      currentProviderId={currentProvider?.id}
                      currentModelId={currentModel?.id}
                      selectedEffortId={normalizedValue.effort}
                      onSelect={(modelId, effortId) =>
                        applySelection(provider.id, modelId, effortId)
                      }
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-5 text-center text-[10px] text-muted-foreground">
              No providers available.
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
