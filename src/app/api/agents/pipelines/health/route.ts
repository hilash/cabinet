import { NextRequest, NextResponse } from "next/server";
import {
  deleteHealthSchedule,
  getHealthReport,
  listHealthReports,
  listHealthSchedules,
  runHealthPipeline,
  upsertHealthSchedule,
} from "@/lib/agents/health-pipeline";
import { reloadDaemonSchedules } from "@/lib/agents/daemon-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Single report lookup by id
    const reportId = searchParams.get("reportId");
    if (reportId) {
      const report = await getHealthReport(reportId);
      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ report });
    }

    const reportsLimitRaw = searchParams.get("reportsLimit");
    const reportsLimit = reportsLimitRaw
      ? Number.parseInt(reportsLimitRaw, 10)
      : 20;

    const [schedules, reports] = await Promise.all([
      listHealthSchedules(),
      listHealthReports(
        Number.isFinite(reportsLimit) && reportsLimit > 0 ? reportsLimit : 20
      ),
    ]);

    return NextResponse.json({ schedules, reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Track in-flight health runs so GET can report "running" status
const runningHealthChecks = new Map<string, { startedAt: string }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "run";
    const appOrigin = new URL(req.url).origin;

    if (action === "run") {
      const reportId = `health-${Date.now()}`;
      const profile = body.profile === "full" ? "full" : "quick";
      const source = body.source === "scheduler" ? "scheduler" : "manual";
      const scheduleId =
        typeof body.scheduleId === "string" ? body.scheduleId : undefined;

      runningHealthChecks.set(reportId, { startedAt: new Date().toISOString() });

      // Fire and forget — run in background
      void runHealthPipeline({
        profile,
        source,
        scheduleId,
        appOriginOverride: appOrigin,
        reportIdOverride: reportId,
      })
        .catch((error) => {
          console.error(`Health pipeline ${reportId} failed:`, error);
        })
        .finally(() => {
          runningHealthChecks.delete(reportId);
        });

      return NextResponse.json(
        { ok: true, reportId, status: "running" },
        { status: 202 }
      );
    }

    if (action === "status") {
      const id = typeof body.reportId === "string" ? body.reportId : "";
      if (!id) {
        return NextResponse.json(
          { error: "reportId is required" },
          { status: 400 }
        );
      }
      // Check if still running
      if (runningHealthChecks.has(id)) {
        return NextResponse.json({ reportId: id, status: "running" });
      }
      // Check if report exists on disk
      const report = await getHealthReport(id);
      if (report) {
        return NextResponse.json({
          reportId: id,
          status: "completed",
          report,
        });
      }
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    if (action === "upsert-schedule") {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400 }
        );
      }
      if (typeof body.schedule !== "string" || !body.schedule.trim()) {
        return NextResponse.json(
          { error: "schedule is required" },
          { status: 400 }
        );
      }

      const schedule = await upsertHealthSchedule({
        id: typeof body.id === "string" ? body.id : undefined,
        name: body.name.trim(),
        schedule: body.schedule.trim(),
        profile: body.profile === "full" ? "full" : "quick",
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      });
      await reloadDaemonSchedules().catch(() => {});
      return NextResponse.json({ ok: true, schedule });
    }

    if (action === "delete-schedule") {
      if (typeof body.id !== "string" || !body.id.trim()) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const deleted = await deleteHealthSchedule(body.id.trim());
      if (!deleted) {
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }
      await reloadDaemonSchedules().catch(() => {});
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
