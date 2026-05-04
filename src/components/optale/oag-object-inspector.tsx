"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  Brain,
  Building2,
  Database,
  ExternalLink,
  FileText,
  Fingerprint,
  GitBranch,
  Link2,
  ListChecks,
  LockKeyhole,
  Loader2,
  Network,
  Play,
  ScrollText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { confirmDialog } from "@/lib/ui/confirm";
import { cn } from "@/lib/utils";
import { hasOptaleCapability } from "@/lib/optale/capabilities";
import type { OptaleActionDefinition } from "@/lib/optale/action-registry";
import type { OptaleResourceRecord } from "@/lib/optale/resource-registry";
import type { OptaleActionRunRecord } from "@/lib/optale/action-run-ledger";
import type { OptaleAuditEventRecord } from "@/lib/optale/audit-event-log";
import type { OptaleLineageEdgeRecord } from "@/lib/optale/lineage-edge-table";
import type { OptalePolicyDecisionRecord } from "@/lib/optale/policy-decision-log";
import {
  optaleOagObjectSchemaForType,
  type OptaleOagFieldSchema,
  type OptaleOagRelationshipSchema,
} from "@/lib/optale/oag-schema";
import {
  buildOagObjectCommandDraft,
  resolveOagObjectReference,
  type OagObjectReferenceIndex,
  type OagObjectRelationshipInstance,
  type OagObjectRelatedRecords,
} from "@/components/optale/oag-object-explorer-state";

type EvidenceItem = {
  label: string;
  value: string | number | boolean;
};

function formatTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tokenLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function displayToken(value: string | undefined): string {
  if (!value) return "";
  return tokenLabel(value)
    .replaceAll("-", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceSystemLabel(value?: string): string {
  switch (value) {
    case "agent-harness":
      return "Agent Harness";
    case "command-center":
      return "Command Center";
    case "mcp":
      return "Tooling";
    case "brain":
      return "Brain";
    case "cabinet":
      return "Cabinet";
    default:
      return displayToken(value);
  }
}

function materializerLabel(value?: string): string {
  switch (value) {
    case "lineage":
      return "Lineage";
    case "operational_spine":
      return "Operational Spine";
    case "resource_fact":
      return "Object Fact";
    case "runtime":
      return "Runtime";
    default:
      return displayToken(value);
  }
}

function memoryLaneLabel(
  value: string | undefined,
  canViewCompanyBrain: boolean,
): string {
  if (value === "operator_company_brain") {
    return canViewCompanyBrain ? "Company Brain" : "Operator memory";
  }
  if (value === "partner_scoped_memory") return "Scoped memory";
  return displayToken(value);
}

function scopeLabel(value?: string): string {
  if (value === "system") return "Operator";
  if (value === "company") return "Workspace";
  if (value === "personal") return "Personal";
  return displayToken(value);
}

function visibilityLabel(value?: string): string {
  if (value === "tenant_scoped") return "Workspace scoped";
  if (value === "operator_only") return "Operator only";
  if (value === "private") return "Private";
  return displayToken(value);
}

function listLabel(values: string[] | undefined): string {
  if (!values || values.length === 0) return "";
  return values.map(displayToken).join(", ");
}

function valueType(value: EvidenceItem["value"]): string {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

function factIsDiagnostic(fact: OptaleResourceRecord["facts"][number]): boolean {
  const label = fact.label.toLowerCase();
  const value = String(fact.value).toLowerCase();
  return (
    label === "mcp" ||
    label === "provider" ||
    label.includes("token") ||
    label.includes("path") ||
    value.startsWith("mcp-server:") ||
    value.includes("/.agents/") ||
    value.includes(".agents/")
  );
}

function statusTone(value?: string): string {
  const normalized = value?.toLowerCase() || "";
  if (
    normalized.includes("allow") ||
    normalized.includes("completed") ||
    normalized.includes("active") ||
    normalized.includes("info")
  ) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (
    normalized.includes("deny") ||
    normalized.includes("blocked") ||
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("rejected")
  ) {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  if (
    normalized.includes("review") ||
    normalized.includes("pending") ||
    normalized.includes("running") ||
    normalized.includes("warning")
  ) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-muted text-muted-foreground";
}

function shouldShowEvidenceItem(item: EvidenceItem): boolean {
  const label = item.label.toLowerCase();
  const value = String(item.value).toLowerCase();
  if (
    label.includes("mcp server") ||
    label === "mcp source" ||
    label.includes("action run") ||
    label.includes("policy decision")
  ) {
    return false;
  }
  if (
    value.startsWith("command:") ||
    value.startsWith("policy:") ||
    value.startsWith("mcp-server:") ||
    value.startsWith("mcp:")
  ) {
    return false;
  }
  return true;
}

function operatorOnlyAction(action: OptaleActionDefinition): boolean {
  return action.facts.some(
    (fact) =>
      fact.label === "Availability" &&
      String(fact.value).toLowerCase() === "operator-only",
  );
}

function Pill({ value }: { value?: string | number | boolean }) {
  if (value === undefined || value === "") return null;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium capitalize",
        statusTone(String(value)),
      )}
    >
      <span className="truncate">{displayToken(String(value))}</span>
    </span>
  );
}

function MetaLine({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean;
}) {
  if (value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-[11px] leading-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground/80">{String(value)}</dd>
    </div>
  );
}

function ReferenceValue({
  value,
  targetId,
  targetLabel,
  onSelectResource,
}: {
  value: string;
  targetId?: string;
  targetLabel?: string;
  onSelectResource?: (resourceId: string) => void;
}) {
  if (!targetId || !onSelectResource) {
    return <span className="break-words text-foreground/80">{value}</span>;
  }

  return (
    <button
      type="button"
      title={targetLabel ? `Open ${targetLabel}` : "Open object"}
      onClick={() => onSelectResource(targetId)}
      className="inline-flex max-w-full items-center gap-1 text-left font-medium text-primary hover:underline"
    >
      <span className="truncate">{value}</span>
      <ExternalLink className="size-3 shrink-0" />
    </button>
  );
}

function ReferenceMetaLine({
  label,
  value,
  targetId,
  targetLabel,
  onSelectResource,
}: {
  label: string;
  value: string;
  targetId?: string;
  targetLabel?: string;
  onSelectResource?: (resourceId: string) => void;
}) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-[11px] leading-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">
        <ReferenceValue
          value={value}
          targetId={targetId}
          targetLabel={targetLabel}
          onSelectResource={onSelectResource}
        />
      </dd>
    </div>
  );
}

function EvidencePreview({
  evidence,
  showDiagnostics,
  limit = 3,
}: {
  evidence: EvidenceItem[];
  showDiagnostics: boolean;
  limit?: number;
}) {
  const visibleEvidence = showDiagnostics
    ? evidence
    : evidence.filter(shouldShowEvidenceItem);
  if (visibleEvidence.length === 0) return null;
  return (
    <dl className="mt-2 space-y-1">
      {visibleEvidence.slice(0, limit).map((item) => (
        <MetaLine
          key={`${item.label}:${String(item.value)}`}
          label={item.label}
          value={item.value}
        />
      ))}
    </dl>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value?: string | number | boolean;
  icon: React.ReactNode;
  tone?: "neutral" | "accent" | "locked";
}) {
  if (value === undefined || value === "") return null;
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border px-2.5 py-2",
        tone === "accent"
          ? "border-primary/25 bg-primary/5"
          : tone === "locked"
            ? "border-amber-500/25 bg-amber-500/10"
            : "border-border bg-background",
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="truncate text-xs font-medium text-foreground">
        {String(value)}
      </p>
    </div>
  );
}

function LineageSnapshot({
  runs,
  policyDecisions,
  lineageEdges,
  auditEvents,
  relationships,
}: {
  runs: OptaleActionRunRecord[];
  policyDecisions: OptalePolicyDecisionRecord[];
  lineageEdges: OptaleLineageEdgeRecord[];
  auditEvents: OptaleAuditEventRecord[];
  relationships: OagObjectRelationshipInstance[];
}) {
  const sourceRelationships = relationships.filter(
    (relationship) =>
      relationship.name.includes("source") ||
      relationship.target.kind === "brain_source",
  ).length;

  return (
    <div className="grid grid-cols-2 gap-2">
      <SummaryTile
        label="Runs"
        value={runs.length}
        icon={<Activity className="size-3" />}
      />
      <SummaryTile
        label="Policy"
        value={policyDecisions.length}
        icon={<ShieldCheck className="size-3" />}
        tone={policyDecisions.length > 0 ? "accent" : "neutral"}
      />
      <SummaryTile
        label="Lineage"
        value={lineageEdges.length}
        icon={<GitBranch className="size-3" />}
      />
      <SummaryTile
        label="Sources"
        value={sourceRelationships}
        icon={<Database className="size-3" />}
      />
      <SummaryTile
        label="Audit"
        value={auditEvents.length}
        icon={<ScrollText className="size-3" />}
      />
    </div>
  );
}

function InspectorSection({
  title,
  count,
  icon,
  empty,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border/70 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {icon}
          <span className="truncate">{title}</span>
        </h3>
        <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

function MoreCount({
  shown,
  total,
}: {
  shown: number;
  total: number;
}) {
  if (total <= shown) return null;
  return (
    <p className="pt-2 text-[11px] text-muted-foreground">
      +{total - shown} more
    </p>
  );
}

function RunRow({
  run,
  showDiagnostics,
}: {
  run: OptaleActionRunRecord;
  showDiagnostics: boolean;
}) {
  return (
    <div className="border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {run.label}
          </p>
          {showDiagnostics && (
            <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
              {run.id}
            </p>
          )}
        </div>
        <Pill value={run.status} />
      </div>
      <dl className="mt-2 space-y-1">
        <MetaLine label="Source" value={sourceSystemLabel(run.source)} />
        <MetaLine label="Agent" value={run.agentSlug} />
        {showDiagnostics && (
          <MetaLine label="Run Ref" value={run.conversationId} />
        )}
        <MetaLine label="Updated" value={formatTime(run.updatedAt || run.createdAt)} />
      </dl>
      <EvidencePreview evidence={run.evidence} showDiagnostics={showDiagnostics} />
      {run.href && (
        <a
          href={run.href}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-3" />
          Open run
        </a>
      )}
    </div>
  );
}

function PolicyRow({
  decision,
  showDiagnostics,
}: {
  decision: OptalePolicyDecisionRecord;
  showDiagnostics: boolean;
}) {
  return (
    <div className="border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {displayToken(decision.reasonCode)}
          </p>
          {showDiagnostics && (
            <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
              {decision.id}
            </p>
          )}
        </div>
        <Pill value={decision.outcome} />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {decision.explanation}
      </p>
      <dl className="mt-2 space-y-1">
        {showDiagnostics && (
          <MetaLine label="Action Run" value={decision.subjectId} />
        )}
        <MetaLine label="Actor" value={decision.actor} />
        <MetaLine label="Evaluated" value={formatTime(decision.evaluatedAt)} />
      </dl>
    </div>
  );
}

function LineageRow({
  edge,
  referenceIndex,
  onSelectResource,
  showDiagnostics,
}: {
  edge: OptaleLineageEdgeRecord;
  referenceIndex: OagObjectReferenceIndex;
  onSelectResource?: (resourceId: string) => void;
  showDiagnostics: boolean;
}) {
  const sourceTarget = resolveOagObjectReference(referenceIndex, [
    edge.source.id,
    `${edge.source.kind}:${edge.source.id}`,
    edge.source.label,
  ]);
  const targetTarget = resolveOagObjectReference(referenceIndex, [
    edge.target.id,
    `${edge.target.kind}:${edge.target.id}`,
    edge.target.label,
  ]);

  return (
    <div className="border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex min-w-0 flex-wrap items-center gap-1 text-sm font-medium text-foreground">
            <ReferenceValue
              value={edge.source.label}
              targetId={sourceTarget?.resourceId}
              targetLabel={sourceTarget?.label}
              onSelectResource={onSelectResource}
            />
            <span className="text-muted-foreground">to</span>
            <ReferenceValue
              value={edge.target.label}
              targetId={targetTarget?.resourceId}
              targetLabel={targetTarget?.label}
              onSelectResource={onSelectResource}
            />
          </p>
          {showDiagnostics && (
            <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
              {edge.id}
            </p>
          )}
        </div>
        <Pill value={edge.kind} />
      </div>
      <dl className="mt-2 space-y-1">
        {showDiagnostics && (
          <>
            <ReferenceMetaLine
              label="Source"
              value={`${edge.source.kind}:${edge.source.id}`}
              targetId={sourceTarget?.resourceId}
              targetLabel={sourceTarget?.label}
              onSelectResource={onSelectResource}
            />
            <ReferenceMetaLine
              label="Target"
              value={`${edge.target.kind}:${edge.target.id}`}
              targetId={targetTarget?.resourceId}
              targetLabel={targetTarget?.label}
              onSelectResource={onSelectResource}
            />
          </>
        )}
        <MetaLine label="Created" value={formatTime(edge.createdAt)} />
      </dl>
    </div>
  );
}

function AuditRow({
  event,
  showDiagnostics,
}: {
  event: OptaleAuditEventRecord;
  showDiagnostics: boolean;
}) {
  return (
    <div className="border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {event.summary}
          </p>
          {showDiagnostics && (
            <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
              {event.id}
            </p>
          )}
        </div>
        <Pill value={event.severity} />
      </div>
      <dl className="mt-2 space-y-1">
        {showDiagnostics && (
          <MetaLine
            label="Subject"
            value={`${event.subjectType}:${event.subjectId}`}
          />
        )}
        <MetaLine label="Actor" value={event.actor} />
        <MetaLine label="Occurred" value={formatTime(event.occurredAt)} />
      </dl>
    </div>
  );
}

function ActionRow({
  action,
  resource,
  running,
  showDiagnostics,
  onRun,
}: {
  action: OptaleActionDefinition;
  resource: OptaleResourceRecord;
  running: boolean;
  showDiagnostics: boolean;
  onRun: (action: OptaleActionDefinition) => void;
}) {
  const draft = buildOagObjectCommandDraft(resource, action);
  const availability = action.facts.find(
    (fact) => fact.label === "Availability",
  )?.value;

  return (
    <div className="border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {action.label}
          </p>
          {showDiagnostics && (
            <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
              {action.id}
            </p>
          )}
        </div>
        <Pill value={availability || action.status} />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {action.description}
      </p>
      <dl className="mt-2 space-y-1">
        <MetaLine label="Kind" value={displayToken(action.kind)} />
        <MetaLine label="Risk" value={action.risk} />
        <MetaLine label="Approval" value={action.oagContract?.approval} />
        <MetaLine
          label="Targets"
          value={listLabel(action.oagContract?.targetObjectTypes)}
        />
        <MetaLine
          label="Results"
          value={listLabel(action.oagContract?.resultObjectTypes)}
        />
        <MetaLine label="Inputs" value={action.inputs.length} />
        <MetaLine label="Surface" value={sourceSystemLabel(action.source)} />
        {showDiagnostics && (
          <MetaLine label="Path" value={action.executionPath} />
        )}
      </dl>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="min-w-0 text-[11px] leading-5 text-muted-foreground">
          {draft.disabledReason || "Runs through Command Center policy gates."}
        </p>
        <Button
          type="button"
          size="sm"
          variant={draft.executable ? "default" : "outline"}
          disabled={!draft.executable || running}
          onClick={() => onRun(action)}
          className="h-7 shrink-0 px-2 text-xs"
        >
          {running ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <Play className="mr-1 size-3" />
          )}
          {draft.buttonLabel}
        </Button>
      </div>
    </div>
  );
}

function SchemaFieldRow({
  fact,
}: {
  fact: OptaleResourceRecord["facts"][number];
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_70px] gap-3 border-t border-border/50 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">
          {fact.label}
        </p>
        <p className="mt-0.5 break-words text-[11px] leading-5 text-muted-foreground">
          {String(fact.value)}
        </p>
      </div>
      <div className="flex justify-end">
        <Pill value={valueType(fact.value)} />
      </div>
    </div>
  );
}

function SchemaDefinitionRow({ field }: { field: OptaleOagFieldSchema }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_70px] gap-3 border-t border-border/50 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p className="truncate text-xs font-medium text-foreground">
            {field.label}
          </p>
          {field.required && <Pill value="required" />}
        </div>
        <p className="mt-0.5 break-words text-[11px] leading-5 text-muted-foreground">
          {field.description}
        </p>
        <dl className="mt-1 space-y-1">
          <MetaLine label="Name" value={field.name} />
          <MetaLine label="Source" value={field.source} />
          <MetaLine label="References" value={listLabel(field.references)} />
          <MetaLine label="Values" value={listLabel(field.enumValues)} />
        </dl>
      </div>
      <div className="flex justify-end">
        <Pill value={field.kind} />
      </div>
    </div>
  );
}

function RelationshipDefinitionRow({
  relationship,
}: {
  relationship: OptaleOagRelationshipSchema;
}) {
  return (
    <div className="border-t border-border/50 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {relationship.label}
          </p>
          <p className="mt-0.5 break-words text-[11px] leading-5 text-muted-foreground">
            {relationship.description}
          </p>
        </div>
        <Pill value={relationship.cardinality} />
      </div>
      <dl className="mt-1 space-y-1">
        <MetaLine label="Name" value={relationship.name} />
        <MetaLine label="Direction" value={relationship.direction} />
        <MetaLine label="Target" value={listLabel(relationship.targetTypes)} />
        <MetaLine
          label="Source"
          value={materializerLabel(relationship.materializedBy)}
        />
      </dl>
    </div>
  );
}

function RelationshipInstanceRow({
  relationship,
  onSelectResource,
  showDiagnostics,
}: {
  relationship: OagObjectRelationshipInstance;
  onSelectResource?: (resourceId: string) => void;
  showDiagnostics: boolean;
}) {
  return (
    <div className="border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {tokenLabel(relationship.label)}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            <ReferenceValue
              value={relationship.target.label}
              targetId={relationship.target.resourceId}
              targetLabel={relationship.target.label}
              onSelectResource={onSelectResource}
            />
          </p>
        </div>
        <Pill value={relationship.direction} />
      </div>
      <dl className="mt-2 space-y-1">
        <MetaLine label="Type" value={relationship.name} />
        <MetaLine label="Target" value={displayToken(relationship.target.kind)} />
        <MetaLine
          label="Source"
          value={materializerLabel(relationship.materializedBy)}
        />
      </dl>
      <EvidencePreview
        evidence={relationship.evidence}
        showDiagnostics={showDiagnostics}
        limit={2}
      />
    </div>
  );
}

export function OagObjectInspector({
  resource,
  related,
  relationships,
  actions,
  referenceIndex,
  onSelectResource,
  onActionExecuted,
  loading,
  error,
}: {
  resource: OptaleResourceRecord | null;
  related: OagObjectRelatedRecords | null;
  relationships?: OagObjectRelationshipInstance[];
  actions?: OptaleActionDefinition[];
  referenceIndex?: OagObjectReferenceIndex;
  onSelectResource?: (resourceId: string) => void;
  onActionExecuted?: () => void;
  loading?: boolean;
  error?: string | null;
}) {
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  if (!resource) {
    return (
      <aside className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        Select an object to inspect.
      </aside>
    );
  }

  const runs = related?.runs || [];
  const policyDecisions = related?.policyDecisions || [];
  const lineageEdges = related?.lineageEdges || [];
  const auditEvents = related?.auditEvents || [];
  const objectRelationships = relationships || [];
  const objectActions = actions || [];
  const showDiagnostics = hasOptaleCapability("diagnostics.raw");
  const canViewCompanyBrain = hasOptaleCapability("company_brain.view");
  const refs = referenceIndex || {};
  const objectSchema = resource.oag
    ? optaleOagObjectSchemaForType(resource.oag.objectType)
    : null;
  const totalRelated =
    runs.length + policyDecisions.length + lineageEdges.length + auditEvents.length;
  const visibleObjectActions = showDiagnostics
    ? objectActions
    : objectActions.filter((action) => !operatorOnlyAction(action));
  const visibleFacts = showDiagnostics
    ? resource.facts
    : resource.facts.filter((fact) => !factIsDiagnostic(fact));
  const hiddenOperatorActionCount =
    objectActions.length - visibleObjectActions.length;

  const runObjectAction = async (action: OptaleActionDefinition) => {
    const draft = buildOagObjectCommandDraft(resource, action);
    if (!draft.executable || !draft.payload) return;

    const payload = { ...draft.payload };
    if (draft.prompt) {
      const value = window.prompt(draft.prompt.label, draft.prompt.placeholder);
      if (!value?.trim()) return;
      payload[draft.prompt.field] = value.trim();
    }
    if (draft.confirmation) {
      const ok = await confirmDialog({
        title: action.label,
        message: draft.confirmation,
        confirmText: draft.buttonLabel,
        destructive: action.risk === "destructive",
      });
      if (!ok) return;
    }

    setRunningActionId(action.id);
    setActionFeedback(null);
    try {
      const response = await fetch("/api/optale/command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(failure?.error || `Command failed: ${response.status}`);
      }
      setActionFeedback({
        tone: "success",
        message: `${action.label} completed.`,
      });
      onActionExecuted?.();
    } catch (err) {
      setActionFeedback({
        tone: "error",
        message: err instanceof Error ? err.message : "Command failed.",
      });
    } finally {
      setRunningActionId(null);
    }
  };

  return (
    <aside className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <header className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <Link2 className="size-3.5" />
              Object Inspector
            </p>
            <h2 className="break-words text-lg font-semibold tracking-normal text-foreground">
              {resource.label}
            </h2>
            {showDiagnostics && (
              <p className="mt-1 break-all text-[11px] text-muted-foreground">
                {resource.id}
              </p>
            )}
          </div>
          <Pill value={resource.status || resource.kind} />
        </div>
        {resource.description && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {resource.description}
          </p>
        )}
        {resource.oag && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SummaryTile
              label="Type"
              value={resource.oag.objectType}
              icon={<Network className="size-3" />}
              tone="accent"
            />
            <SummaryTile
              label="Scope"
              value={scopeLabel(resource.oag.scope)}
              icon={
                resource.oag.scope === "personal" ? (
                  <UserRound className="size-3" />
                ) : (
                  <Building2 className="size-3" />
                )
              }
            />
            <SummaryTile
              label="Memory"
              value={memoryLaneLabel(resource.oag.memoryLane, canViewCompanyBrain)}
              icon={
                resource.oag.memoryLane === "operator_company_brain" &&
                !canViewCompanyBrain ? (
                  <LockKeyhole className="size-3" />
                ) : (
                  <Brain className="size-3" />
                )
              }
              tone={
                resource.oag.memoryLane === "operator_company_brain" &&
                !canViewCompanyBrain
                  ? "locked"
                  : "neutral"
              }
            />
            <SummaryTile
              label="Activity"
              value={loading ? "Loading" : totalRelated}
              icon={<Activity className="size-3" />}
            />
          </div>
        )}
        <dl className="mt-3 space-y-1">
          <MetaLine label="Source" value={sourceSystemLabel(resource.source)} />
          {showDiagnostics && (
            <MetaLine label="Cabinet" value={resource.cabinetPath} />
          )}
          <MetaLine label="Updated" value={formatTime(resource.updatedAt)} />
          <MetaLine label="Visibility" value={visibilityLabel(resource.oag?.visibility)} />
          {showDiagnostics && (
            <MetaLine label="Related" value={loading ? "loading" : totalRelated} />
          )}
        </dl>
        {resource.href && (
          <a
            href={resource.href}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" />
            Open object
          </a>
        )}
        {error && (
          <div className="mt-3 flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {actionFeedback && (
          <div
            className={cn(
              "mt-3 flex gap-2 rounded-md border px-2.5 py-2 text-xs",
              actionFeedback.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {actionFeedback.tone === "success" ? (
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
        )}
      </header>

      <Tabs defaultValue="overview" className="gap-0 border-t border-border/70">
        <div className="border-b border-border/70 px-4 py-2">
          <TabsList variant="line" className="h-8 w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <InspectorSection
            title="Identity"
            count={resource.oag ? 1 : 0}
            icon={<Fingerprint className="size-3.5" />}
            empty="No canonical OAG identity has been projected yet."
          >
            {resource.oag && (
              <dl className="space-y-1">
                {showDiagnostics ? (
                  <MetaLine label="Canonical" value={resource.oag.canonicalId} />
                ) : (
                  <MetaLine
                    label="Identity"
                    value={`${resource.oag.objectType} object`}
                  />
                )}
                <MetaLine label="Type" value={resource.oag.objectType} />
                {showDiagnostics && (
                  <>
                    <MetaLine label="Object ID" value={resource.oag.objectId} />
                    <MetaLine label="Schema" value={resource.oag.schemaRef} />
                  </>
                )}
                <MetaLine label="Scope" value={scopeLabel(resource.oag.scope)} />
                <MetaLine
                  label="Visibility"
                  value={visibilityLabel(resource.oag.visibility)}
                />
                <MetaLine
                  label="Memory"
                  value={memoryLaneLabel(
                    resource.oag.memoryLane,
                    canViewCompanyBrain,
                  )}
                />
                <MetaLine
                  label="Temporal"
                  value={displayToken(resource.oag.temporalMode)}
                />
                <MetaLine
                  label="Source"
                  value={sourceSystemLabel(resource.oag.sourceSystem)}
                />
              </dl>
            )}
          </InspectorSection>

          <InspectorSection
            title="Lineage Snapshot"
            count={totalRelated + objectRelationships.length}
            icon={<Activity className="size-3.5" />}
            empty="No runs, policy decisions, lineage, or source evidence are visible for this object yet."
          >
            <LineageSnapshot
              runs={runs}
              policyDecisions={policyDecisions}
              lineageEdges={lineageEdges}
              auditEvents={auditEvents}
              relationships={objectRelationships}
            />
          </InspectorSection>

          <InspectorSection
            title="Object Neighbors"
            count={objectRelationships.length}
            icon={<GitBranch className="size-3.5" />}
            empty="No concrete OAG relationship instances are visible for this object yet."
          >
            {objectRelationships.slice(0, 6).map((relationship) => (
              <RelationshipInstanceRow
                key={relationship.id}
                relationship={relationship}
                onSelectResource={onSelectResource}
                showDiagnostics={showDiagnostics}
              />
            ))}
            <MoreCount shown={6} total={objectRelationships.length} />
          </InspectorSection>

          <InspectorSection
            title="Facts"
            count={visibleFacts.length}
            icon={<FileText className="size-3.5" />}
            empty="No facts projected for this object."
          >
            <dl className="space-y-1">
              {visibleFacts.map((fact) => (
                <MetaLine
                  key={`${resource.id}:${fact.label}`}
                  label={fact.label}
                  value={fact.value}
                />
              ))}
            </dl>
          </InspectorSection>
        </TabsContent>

        <TabsContent value="schema" className="mt-0">
          <InspectorSection
            title="Type Contract"
            count={objectSchema ? 1 : 0}
            icon={<Database className="size-3.5" />}
            empty="No OAG type metadata has been projected yet."
          >
            {resource.oag && objectSchema && (
              <dl className="space-y-1">
                <MetaLine label="Ontology" value={resource.oag.ontologyVersion} />
                <MetaLine label="Schema" value={resource.oag.schemaRef} />
                <MetaLine label="Type" value={resource.oag.objectType} />
                <MetaLine label="Category" value={displayToken(objectSchema.category)} />
                <MetaLine label="Primary" value={objectSchema.primaryKey} />
                <MetaLine label="Display" value={objectSchema.displayField} />
                <MetaLine label="Fields" value={objectSchema.fields.length} />
                <MetaLine
                  label="Relations"
                  value={objectSchema.relationships.length}
                />
                <MetaLine label="Actions" value={objectSchema.actions.length} />
                <MetaLine
                  label="Systems"
                  value={listLabel(objectSchema.sourceSystems)}
                />
                {showDiagnostics && (
                  <>
                    <MetaLine label="Object ID" value={resource.oag.objectId} />
                    <MetaLine label="Source Ref" value={resource.oag.sourceRef} />
                  </>
                )}
                <MetaLine
                  label="Source"
                  value={sourceSystemLabel(resource.oag.sourceSystem)}
                />
                {showDiagnostics && (
                  <MetaLine label="Cabinet" value={resource.oag.cabinetPath} />
                )}
              </dl>
            )}
          </InspectorSection>

          <InspectorSection
            title="Field Contract"
            count={objectSchema?.fields.length || 0}
            icon={<FileText className="size-3.5" />}
            empty="No field contract is available for this object type yet."
          >
            <div>
              {objectSchema?.fields.map((field) => (
                <SchemaDefinitionRow
                  key={`${resource.id}:field-contract:${field.name}`}
                  field={field}
                />
              ))}
            </div>
          </InspectorSection>

          <InspectorSection
            title="Relationship Types"
            count={objectSchema?.relationships.length || 0}
            icon={<GitBranch className="size-3.5" />}
            empty="No relationship types are available for this object type yet."
          >
            <div>
              {objectSchema?.relationships.map((relationship) => (
                <RelationshipDefinitionRow
                  key={`${resource.id}:relationship:${relationship.name}`}
                  relationship={relationship}
                />
              ))}
            </div>
          </InspectorSection>

          <InspectorSection
            title="Projected Fields"
            count={visibleFacts.length}
            icon={<FileText className="size-3.5" />}
            empty="No projected fields are available for this object yet."
          >
            <div>
              {visibleFacts.map((fact) => (
                <SchemaFieldRow
                  key={`${resource.id}:schema:${fact.label}`}
                  fact={fact}
                />
              ))}
            </div>
          </InspectorSection>
        </TabsContent>

        <TabsContent value="actions" className="mt-0">
          <InspectorSection
            title="Object Actions"
            count={visibleObjectActions.length}
            icon={<ListChecks className="size-3.5" />}
            empty={
              hiddenOperatorActionCount > 0
                ? "No partner-safe actions are available for this object."
                : "No contextual actions are projected for this object yet."
            }
          >
            {visibleObjectActions.slice(0, 6).map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                resource={resource}
                running={runningActionId === action.id}
                showDiagnostics={showDiagnostics}
                onRun={(nextAction) => void runObjectAction(nextAction)}
              />
            ))}
            <MoreCount shown={6} total={visibleObjectActions.length} />
          </InspectorSection>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <InspectorSection
            title="Runs"
            count={runs.length}
            icon={<Activity className="size-3.5" />}
            empty="No action runs are linked yet."
          >
            {runs.slice(0, 5).map((run) => (
              <RunRow
                key={run.id}
                run={run}
                showDiagnostics={showDiagnostics}
              />
            ))}
            <MoreCount shown={5} total={runs.length} />
          </InspectorSection>

          <InspectorSection
            title="Policy"
            count={policyDecisions.length}
            icon={<ShieldCheck className="size-3.5" />}
            empty="No policy decisions are linked yet."
          >
            {policyDecisions.slice(0, 4).map((decision) => (
              <PolicyRow
                key={decision.id}
                decision={decision}
                showDiagnostics={showDiagnostics}
              />
            ))}
            <MoreCount shown={4} total={policyDecisions.length} />
          </InspectorSection>

          <InspectorSection
            title="Lineage"
            count={lineageEdges.length}
            icon={<GitBranch className="size-3.5" />}
            empty="No lineage edges are linked yet."
          >
            {lineageEdges.slice(0, 4).map((edge) => (
              <LineageRow
                key={edge.id}
                edge={edge}
                referenceIndex={refs}
                onSelectResource={onSelectResource}
                showDiagnostics={showDiagnostics}
              />
            ))}
            <MoreCount shown={4} total={lineageEdges.length} />
          </InspectorSection>

          <InspectorSection
            title="Audit"
            count={auditEvents.length}
            icon={<ScrollText className="size-3.5" />}
            empty="No audit events are linked yet."
          >
            {auditEvents.slice(0, 4).map((event) => (
              <AuditRow
                key={event.id}
                event={event}
                showDiagnostics={showDiagnostics}
              />
            ))}
            <MoreCount shown={4} total={auditEvents.length} />
          </InspectorSection>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
