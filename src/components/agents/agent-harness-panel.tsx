"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  Info,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HarnessStatus = "missing" | "present" | "in_sync" | "drift_unknown";
type HarnessMemoryStatus =
  | "planned"
  | "active"
  | "bridge-only"
  | "internal-only"
  | "disabled";

interface HarnessRow {
  definitionId: string;
  name: string;
  role: string;
  description: string;
  scope: "personal" | "company" | "system";
  memoryNamespace: string;
  provider: {
    id: string;
    name: string;
    model: string;
    modelAlias?: string;
  };
  projection: {
    slug: string;
    nativeAgentSlug: string;
    nativePersonaSlug: string;
    targetPath: string;
  };
  legacyLibreChatBridge?: {
    status: string;
    agentId: string;
    sourceScript: string;
    providerName: string;
    model: string;
  };
  mcp: {
    defaultDecision: "deny";
    allowedServerCount: number;
    allowedServers: Array<{
      id: string;
      name?: string;
      permissions: string[];
      toolGroups: string[];
      allowedTools: string[];
      deniedTools: string[];
      notes?: string;
    }>;
    restrictions: string[];
  };
  persona: {
    targetPath: string;
    exists: boolean;
    active?: boolean;
    state?: "active" | "paused";
    provider?: string;
    adapterType?: string;
    model?: string;
    manifestId?: string;
    definitionId?: string;
    projectedAt?: string;
  };
  framework: {
    schemaVersion: 2;
    scopeProfile: {
      scope: "personal" | "company" | "system";
      subjectType: "personal" | "company" | "system";
      privacyBoundary: "private" | "company" | "system";
      memoryNamespace: string;
      vaultNamespace: string;
      graphNamespace: string;
      entityNamespace: string;
      mcpPolicyId: string;
      mcpClientProfile: string;
      promotionBoundary: string;
    };
    senseMemory: {
      cognee: HarnessMemoryStatus;
      openFoundryOag: HarnessMemoryStatus;
      graphiti: HarnessMemoryStatus;
      proprietaryPersonalMemory: HarnessMemoryStatus;
      honchoInternalOnly: boolean;
    };
    bridgeOnly: boolean;
    runtimeStatus: string;
    projectionStatus: string;
  };
  manifest: {
    kind: "agent-definition-v1";
    manifestId: string;
    manifestSchemaVersion: number;
    definitionId: string;
    definitionSchemaVersion: number;
  };
  actionPolicy: {
    mode: "never" | "on-request" | "always";
    requiredFor: string[];
    notes?: string;
    mutationRequiresApproval: boolean;
    companyWritesRequirePromotion: true;
  };
  status: HarnessStatus;
  issues: string[];
}

interface HarnessSnapshot {
  manifestId: string;
  manifestSchemaVersion: number;
  targetAgentsDir: string;
  rows: HarnessRow[];
}

const STATUS_META: Record<
  HarnessStatus,
  {
    label: string;
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  in_sync: {
    label: "In sync",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
  },
  present: {
    label: "Present",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    icon: CheckCircle2,
  },
  drift_unknown: {
    label: "Drift unknown",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon: AlertTriangle,
  },
  missing: {
    label: "Missing",
    className: "border-muted bg-muted/30 text-muted-foreground",
    icon: FileQuestion,
  },
};

function providerModel(row: HarnessRow): string {
  return row.provider.modelAlias
    ? `${row.provider.modelAlias} (${row.provider.model})`
    : row.provider.model;
}

function statusBadge(status: HarnessStatus) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        meta.className
      )}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

function stateBadge(row: HarnessRow) {
  if (!row.persona.exists) {
    return (
      <span className="inline-flex rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
        Not generated
      </span>
    );
  }

  const paused = row.persona.active === false;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        paused
          ? "bg-muted/50 text-muted-foreground"
          : "bg-emerald-500/10 text-emerald-300"
      )}
    >
      {paused ? "Paused" : "Active"}
    </span>
  );
}

function senseMemoryItems(row: HarnessRow) {
  return [
    ["Cognee", row.framework.senseMemory.cognee],
    ["OAG", row.framework.senseMemory.openFoundryOag],
    ["Graphiti", row.framework.senseMemory.graphiti],
    ["Personal", row.framework.senseMemory.proprietaryPersonalMemory],
  ] as const;
}

function memoryStatusClassName(status: HarnessMemoryStatus): string {
  if (status === "active") return "bg-emerald-500/10 text-emerald-300";
  if (status === "bridge-only") return "bg-amber-500/10 text-amber-300";
  if (status === "internal-only") return "bg-sky-500/10 text-sky-300";
  if (status === "disabled") return "bg-muted/40 text-muted-foreground";
  return "bg-muted/30 text-muted-foreground";
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function permissionPosture(row: HarnessRow): string {
  const permissions = uniq(
    row.mcp.allowedServers.flatMap((server) => server.permissions)
  );
  return permissions.length ? permissions.join(" / ") : "none";
}

function formatDate(value?: string): string {
  if (!value) return "Not projected";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-muted/10 p-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | boolean | null;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "min-w-0 break-words text-[12px] text-foreground",
          mono && "font-mono text-[11px]"
        )}
      >
        {value === undefined || value === null || value === "" ? "None" : String(value)}
      </div>
    </div>
  );
}

function DetailPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

function DetailList({
  items,
  empty = "None",
}: {
  items: string[];
  empty?: string;
}) {
  if (items.length === 0) {
    return <div className="text-[12px] text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item} className="text-[12px] leading-5 text-foreground">
          {item}
        </div>
      ))}
    </div>
  );
}

function HarnessDetailDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: HarnessRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  const tools = uniq(row.mcp.allowedServers.flatMap((server) => server.allowedTools));
  const deniedTools = uniq(
    row.mcp.allowedServers.flatMap((server) => server.deniedTools)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-[760px] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-l border-border/70 p-0 sm:max-w-[760px]"
      >
        <DialogHeader className="border-b border-border/70 p-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(row.status)}
            {stateBadge(row)}
            <DetailPill>AGENTS-FW v{row.framework.schemaVersion}</DetailPill>
          </div>
          <DialogTitle className="mt-3 text-[18px]">{row.name}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {row.role} / {row.projection.slug}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 xl:grid-cols-2">
            <DetailSection title="Manifest And Sync">
              <DetailField label="v1 manifest" value={row.manifest.manifestId} mono />
              <DetailField
                label="Definition"
                value={`${row.manifest.definitionId} v${row.manifest.definitionSchemaVersion}`}
                mono
              />
              <DetailField
                label="Persona state"
                value={row.persona.exists ? row.persona.state || "present" : "missing"}
              />
              <DetailField label="Projected at" value={formatDate(row.persona.projectedAt)} mono />
              <DetailField label="Drift status" value={STATUS_META[row.status].label} />
              {row.issues.length > 0 ? (
                <div className="pt-1">
                  <div className="mb-1 text-[11px] text-muted-foreground">Issues</div>
                  <DetailList items={row.issues} />
                </div>
              ) : null}
            </DetailSection>

            <DetailSection title="Runtime And Projection">
              <DetailField label="Provider" value={row.provider.name || row.provider.id} />
              <DetailField
                label="Adapter"
                value={row.persona.adapterType || "Not generated"}
                mono
              />
              <DetailField
                label="Model"
                value={row.persona.model || providerModel(row)}
                mono
              />
              <DetailField
                label="Native agent"
                value={row.projection.nativeAgentSlug}
                mono
              />
              <DetailField
                label="Native persona"
                value={row.projection.nativePersonaSlug}
                mono
              />
              <DetailField
                label="Projection"
                value={`${row.framework.runtimeStatus} / ${row.framework.projectionStatus}`}
              />
            </DetailSection>

            <DetailSection title="AGENTS-FW Scope Profile">
              <div className="flex flex-wrap gap-1">
                <DetailPill>{row.framework.scopeProfile.privacyBoundary}</DetailPill>
                <DetailPill>{row.framework.scopeProfile.subjectType}</DetailPill>
                <DetailPill>{row.framework.scopeProfile.promotionBoundary}</DetailPill>
              </div>
              <DetailField
                label="Memory"
                value={row.framework.scopeProfile.memoryNamespace}
                mono
              />
              <DetailField
                label="Vault"
                value={row.framework.scopeProfile.vaultNamespace}
                mono
              />
              <DetailField
                label="Graph"
                value={row.framework.scopeProfile.graphNamespace}
                mono
              />
              <DetailField
                label="Entities"
                value={row.framework.scopeProfile.entityNamespace}
                mono
              />
              <DetailField
                label="MCP policy"
                value={row.framework.scopeProfile.mcpPolicyId}
                mono
              />
              <DetailField
                label="MCP client"
                value={row.framework.scopeProfile.mcpClientProfile}
                mono
              />
            </DetailSection>

            <DetailSection title="Sense Memory">
              <div className="flex flex-wrap gap-1">
                {senseMemoryItems(row).map(([label, status]) => (
                  <DetailPill
                    key={label}
                    className={memoryStatusClassName(status)}
                  >
                    {label}: {status}
                  </DetailPill>
                ))}
                {row.framework.senseMemory.honchoInternalOnly ? (
                  <DetailPill className="bg-sky-500/10 text-sky-300">
                    Honcho internal-only
                  </DetailPill>
                ) : null}
              </div>
            </DetailSection>

            <DetailSection title="Tool Policy">
              <DetailField label="Default decision" value={row.mcp.defaultDecision} />
              <DetailField label="Posture" value={permissionPosture(row)} />
              <DetailField label="Allowed servers" value={row.mcp.allowedServerCount} />
              <div className="flex flex-wrap gap-1">
                {row.mcp.allowedServers.map((server) => (
                  <DetailPill key={server.id}>
                    {server.id}: {server.permissions.join("/")}
                  </DetailPill>
                ))}
              </div>
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Allowed tools</div>
                <DetailList items={tools} empty="Policy uses server-level allowlists" />
              </div>
              {deniedTools.length > 0 ? (
                <div>
                  <div className="mb-1 text-[11px] text-muted-foreground">Denied tools</div>
                  <DetailList items={deniedTools} />
                </div>
              ) : null}
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Restrictions</div>
                <DetailList items={row.mcp.restrictions} />
              </div>
            </DetailSection>

            <DetailSection title="Action Policy">
              <DetailField label="Approval mode" value={row.actionPolicy.mode} />
              <DetailField
                label="Mutations"
                value={
                  row.actionPolicy.mutationRequiresApproval
                    ? "approval required"
                    : "not gated"
                }
              />
              <DetailField
                label="Company writes"
                value={
                  row.actionPolicy.companyWritesRequirePromotion
                    ? "promotion required"
                    : "not gated"
                }
              />
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">Required for</div>
                <DetailList items={row.actionPolicy.requiredFor} />
              </div>
              {row.actionPolicy.notes ? (
                <DetailField label="Notes" value={row.actionPolicy.notes} />
              ) : null}
            </DetailSection>

            <DetailSection title="Bridge Metadata">
              {row.legacyLibreChatBridge ? (
                <>
                  <DetailField
                    label="LibreChat id"
                    value={row.legacyLibreChatBridge.agentId}
                    mono
                  />
                  <DetailField
                    label="Status"
                    value={`${row.legacyLibreChatBridge.status} / bridge-only`}
                  />
                  <DetailField
                    label="Bridge provider"
                    value={row.legacyLibreChatBridge.providerName}
                  />
                  <DetailField
                    label="Bridge model"
                    value={row.legacyLibreChatBridge.model}
                    mono
                  />
                  <DetailField
                    label="Source script"
                    value={row.legacyLibreChatBridge.sourceScript}
                    mono
                  />
                </>
              ) : (
                <div className="text-[12px] text-muted-foreground">None</div>
              )}
            </DetailSection>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HarnessLoadingRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-lg border border-border/60 bg-muted/20"
        />
      ))}
    </div>
  );
}

export function AgentHarnessPanel() {
  const [snapshot, setSnapshot] = useState<HarnessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(
    null
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/harness", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Harness status failed (${response.status})`);
      }
      setSnapshot((await response.json()) as HarnessSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Harness status failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const counts = useMemo(() => {
    const rows = snapshot?.rows || [];
    return {
      total: rows.length,
      present: rows.filter((row) => row.persona.exists).length,
      inSync: rows.filter((row) => row.status === "in_sync").length,
      paused: rows.filter((row) => row.persona.exists && row.persona.active === false).length,
    };
  }, [snapshot]);

  const selectedRow = useMemo(() => {
    if (!selectedDefinitionId) return null;
    return (
      snapshot?.rows.find((row) => row.definitionId === selectedDefinitionId) ||
      null
    );
  }, [selectedDefinitionId, snapshot]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
            Agent Harness
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="rounded-full bg-muted/40 px-2 py-0.5">
              {snapshot?.manifestId || "optale-command.meta-agents"} v
              {snapshot?.manifestSchemaVersion || 1}
            </span>
            <span className="rounded-full bg-muted/40 px-2 py-0.5">
              {counts.present}/{counts.total || 9} personas
            </span>
            <span className="rounded-full bg-muted/40 px-2 py-0.5">
              {counts.inSync} in sync
            </span>
            <span className="rounded-full bg-muted/40 px-2 py-0.5">
              {counts.paused} paused
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-[11px]"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      ) : null}

      {loading && !snapshot ? (
        <HarnessLoadingRows />
      ) : snapshot ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse text-left text-[12px]">
              <thead className="border-b border-border/70 bg-muted/25 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Agent</th>
                  <th className="px-3 py-2 font-medium">Projection</th>
                  <th className="px-3 py-2 font-medium">Provider</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Scope Profile</th>
                  <th className="px-3 py-2 font-medium">Sense Memory</th>
                  <th className="px-3 py-2 font-medium">MCP</th>
                  <th className="px-3 py-2 font-medium">Native Target</th>
                  <th className="px-3 py-2 font-medium">Legacy Bridge</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {snapshot.rows.map((row) => (
                  <tr key={row.definitionId} className="align-top">
                    <td className="max-w-[210px] px-3 py-3">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                        {row.description || row.role}
                      </div>
                      <div className="mt-2 inline-flex rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {row.scope}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 gap-1 px-2 text-[10px]"
                        onClick={() => setSelectedDefinitionId(row.definitionId)}
                      >
                        <Info className="size-3" />
                        Details
                      </Button>
                    </td>
                    <td className="max-w-[190px] px-3 py-3">
                      <div className="font-mono text-[11px] text-foreground">
                        {row.projection.slug}
                      </div>
                      <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                        {row.definitionId}
                      </div>
                    </td>
                    <td className="max-w-[180px] px-3 py-3">
                      <div className="font-mono text-[11px] text-foreground">
                        {row.provider.id}
                      </div>
                      <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                        {providerModel(row)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {stateBadge(row)}
                      {row.persona.exists ? (
                        <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                          {row.persona.provider || row.provider.id}
                          {" / "}
                          {row.persona.model || providerModel(row)}
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-[190px] px-3 py-3">
                      <div className="inline-flex rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {row.framework.scopeProfile.privacyBoundary}
                      </div>
                      <span className="ml-1 inline-flex rounded-full bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {row.framework.scopeProfile.subjectType}
                      </span>
                      <div className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
                        {row.framework.scopeProfile.memoryNamespace}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {row.framework.scopeProfile.promotionBoundary}
                      </div>
                    </td>
                    <td className="max-w-[230px] px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {senseMemoryItems(row).map(([label, status]) => (
                          <span
                            key={label}
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px]",
                              memoryStatusClassName(status)
                            )}
                            title={status}
                          >
                            {label}
                          </span>
                        ))}
                        {row.framework.senseMemory.honchoInternalOnly ? (
                          <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">
                            Honcho internal
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-[230px] px-3 py-3">
                      <div className="text-[11px] text-foreground">
                        {row.mcp.allowedServerCount} allowed
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.mcp.allowedServers.map((server) => (
                          <span
                            key={server.id}
                            className="rounded-full bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                            title={server.permissions.join(", ")}
                          >
                            {server.id}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="max-w-[210px] px-3 py-3">
                      <div className="font-mono text-[11px] text-foreground">
                        {row.projection.nativePersonaSlug}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {row.framework.runtimeStatus}
                        </span>
                        <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {row.framework.projectionStatus}
                        </span>
                      </div>
                      <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                        {row.projection.targetPath}
                      </div>
                    </td>
                    <td className="max-w-[190px] px-3 py-3">
                      {row.legacyLibreChatBridge ? (
                        <>
                          <div className="font-mono text-[11px] text-foreground">
                            {row.legacyLibreChatBridge.agentId}
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {row.legacyLibreChatBridge.status}
                          </div>
                          {row.framework.bridgeOnly ? (
                            <div className="mt-1 inline-flex rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                              bridge-only
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="max-w-[190px] px-3 py-3">
                      {statusBadge(row.status)}
                      {row.issues.length > 0 ? (
                        <div className="mt-2 space-y-1 text-[10px] leading-4 text-muted-foreground">
                          {row.issues.slice(0, 3).map((issue) => (
                            <div key={issue}>{issue}</div>
                          ))}
                          {row.issues.length > 3 ? (
                            <div>+{row.issues.length - 3} more</div>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/60 px-3 py-2 font-mono text-[10px] text-muted-foreground">
            {snapshot.targetAgentsDir}
          </div>
        </div>
      ) : null}
      <HarnessDetailDrawer
        row={selectedRow}
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedDefinitionId(null);
        }}
      />
    </section>
  );
}
