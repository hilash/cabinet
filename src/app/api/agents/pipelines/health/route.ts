import { NextResponse } from "next/server";
import {
  deleteHealthSchedule,
  getHealthReport,
  listHealthReports,
  listHealthSchedules,
  runHealthPipeline,
  upsertHealthSchedule,
} from "@/lib/agents/health-pipeline";
import { reloadDaemonSchedules } from "@/lib/agents/daemon-client";
import {
  createGetHandler,
  createHandler,
  HttpError,
} from "@/lib/http/create-handler";

export const GET = createGetHandler({
  handler: async (req) => {
    const { searchParams } = new URL(req.url);

    const reportId = searchParams.get("reportId");
    if (reportId) {
      const report = await getHealthReport(reportId);
      if (!report) {
        throw new HttpError(404, "Report not found");
      }
      return { report };
    }

    const reportsLimitRaw = searchParams.get("reportsLimit");
    const reportsLimit = reportsLimitRaw
      ? Number.parseInt(reportsLimitRaw, 10)
      : 20;

    const [schedules, reports] = await Promise.all([
      listHealthSchedules(),
      listHealthReports(
        Number.isFinite(reportsLimit) && reportsLimit > 0 ? reportsLimit : 20,
      ),
    ]);

    return { schedules, reports };
  },
});

const runningHealthChecks = new Map<string, { startedAt: string }>();

export const POST = createHandler({
  handler: async (_input, req) => {
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
        { status: 202 },
      );
    }

    if (action === "status") {
      const id = typeof body.reportId === "string" ? body.reportId : "";
      if (!id) {
        throw new HttpError(400, "reportId is required");
      }
      if (runningHealthChecks.has(id)) {
        return { reportId: id, status: "running" };
      }
      const report = await getHealthReport(id);
      if (report) {
        return { reportId: id, status: "completed", report };
      }
      throw new HttpError(404, "Report not found");
    }

    if (action === "upsert-schedule") {
      if (typeof body.name !== "string" || !body.name.trim()) {
        throw new HttpError(400, "name is required");
      }
      if (typeof body.schedule !== "string" || !body.schedule.trim()) {
        throw new HttpError(400, "schedule is required");
      }

      const schedule = await upsertHealthSchedule({
        id: typeof body.id === "string" ? body.id : undefined,
        name: body.name.trim(),
        schedule: body.schedule.trim(),
        profile: body.profile === "full" ? "full" : "quick",
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      });
      await reloadDaemonSchedules().catch(() => {});
      return { ok: true, schedule };
    }

    if (action === "delete-schedule") {
      if (typeof body.id !== "string" || !body.id.trim()) {
        throw new HttpError(400, "id is required");
      }
      const deleted = await deleteHealthSchedule(body.id.trim());
      if (!deleted) {
        throw new HttpError(404, "Schedule not found");
      }
      await reloadDaemonSchedules().catch(() => {});
      return { ok: true };
    }

    throw new HttpError(400, "Unknown action");
  },
});
