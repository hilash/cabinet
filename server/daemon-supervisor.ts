import path from "path";
import type http from "http";
import chokidar from "chokidar";
import type Database from "better-sqlite3";
import {
  loadCabinetConfig,
  watchCabinetConfig,
} from "../src/lib/config/cabinet-config";
import {
  DEFAULT_CABINET_CONFIG,
  type CabinetConfig,
} from "../src/lib/config/schema";
import { superviseService } from "./service-supervisor";
import type { ServiceContext, ServiceModule } from "./service-module";
import { createTerminalServerModule } from "./services/terminal-server.module";
import { createMulticaPollerModule } from "./services/multica-poller.module";
import { createTelegramModule } from "./services/telegram.module";
import type { Scheduler } from "./scheduler";

export interface DaemonSupervisorOptions {
  dataDir: string;
  db: Database.Database;
  agentsDir: string;
  server: http.Server;
  port: number;
  scheduler: Scheduler;
  onTerminalReady: () => void;
}

export interface DaemonSupervisor {
  modules: ServiceModule[];
  start(): Promise<void>;
  stop(): Promise<void>;
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack || err.message;
  }
  return String(err);
}

export function createDaemonSupervisor(opts: DaemonSupervisorOptions): DaemonSupervisor {
  const abortController = new AbortController();
  let currentConfig: CabinetConfig = DEFAULT_CABINET_CONFIG;
  let stopWatchingConfig: (() => void) | null = null;

  const terminalModule = createTerminalServerModule({
    port: opts.port,
    server: opts.server,
    onStarted: opts.onTerminalReady,
  });

  async function waitForServiceUp(module: ServiceModule, signal: AbortSignal): Promise<void> {
    while (!signal.aborted && module.health().status !== "up") {
      await new Promise<void>((resolve) => {
        const onAbort = () => {
          clearTimeout(timer);
          cleanup();
          resolve();
        };
        const cleanup = () => {
          signal.removeEventListener("abort", onAbort);
        };
        const timer = setTimeout(() => {
          cleanup();
          resolve();
        }, 250);
        signal.addEventListener("abort", onAbort, { once: true });
      });
    }
  }

  const multicaModule = createMulticaPollerModule({
    waitUntilReady: (signal) => waitForServiceUp(terminalModule, signal),
  });
  const telegramModule = createTelegramModule({
    waitUntilReady: (signal) => waitForServiceUp(terminalModule, signal),
  });
  const modules: ServiceModule[] = [terminalModule, multicaModule, telegramModule];

  function buildServiceContext(signal: AbortSignal, module: ServiceModule): ServiceContext {
    return {
      signal,
      dataDir: opts.dataDir,
      db: opts.db,
      config: currentConfig,
      log: (msg: string) => {
        console.log(`[service:${module.name}] ${msg}`);
      },
    };
  }

  async function reloadModules(filter: (module: ServiceModule) => boolean): Promise<void> {
    const reloadTargets = modules.filter(
      (module): module is ServiceModule & Required<Pick<ServiceModule, "reload">> =>
        filter(module) && typeof module.reload === "function",
    );

    await Promise.all(
      reloadTargets.map(async (module) => {
        try {
          await module.reload();
        } catch (err) {
          console.error(`[supervisor:${module.name}] reload failed:`, formatError(err));
        }
      }),
    );
  }

  const scheduleWatcher = chokidar.watch(
    [
      path.join(opts.agentsDir, "*/persona.md"),
      path.join(opts.agentsDir, "*/jobs/*.yaml"),
    ],
    { ignoreInitial: true },
  );

  scheduleWatcher.on("all", (_event, filePath) => {
    opts.scheduler.queueReload();
    if (filePath && filePath.endsWith("persona.md")) {
      void reloadModules((module) => module.name === "multica-poller");
    }
  });

  async function start(): Promise<void> {
    currentConfig = await loadCabinetConfig(opts.dataDir);
    stopWatchingConfig = watchCabinetConfig(opts.dataDir, async (config) => {
      currentConfig = config;
      opts.scheduler.queueReload();
      await reloadModules(() => true);
    });

    await Promise.all(
      modules.map((module) =>
        superviseService(
          module.name,
          async (signal) => {
            await module.start(buildServiceContext(signal, module));
          },
          { signal: abortController.signal },
        ),
      ),
    );
  }

  async function stop(): Promise<void> {
    stopWatchingConfig?.();
    stopWatchingConfig = null;
    await scheduleWatcher.close().catch(() => {});
    abortController.abort();
    await Promise.all(modules.map((module) => module.stop().catch(() => {})));
  }

  return { modules, start, stop };
}
