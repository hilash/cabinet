import {
  reloadMulticaPoller,
  startMulticaPoller,
  stopMulticaPoller,
} from "../multica-poller";
import {
  createServiceState,
  waitForAbort,
  type ServiceModule,
} from "../service-module";

interface MulticaPollerModuleOptions {
  waitUntilReady?: (signal: AbortSignal) => Promise<void>;
}

export function createMulticaPollerModule(
  options: MulticaPollerModuleOptions = {},
): ServiceModule {
  const state = createServiceState();
  let dataDir: string | null = null;

  return {
    name: "multica-poller",
    async start(ctx) {
      state.starting();
      try {
        await options.waitUntilReady?.(ctx.signal);
        if (ctx.signal.aborted) {
          state.down();
          return;
        }

        dataDir = ctx.dataDir;
        startMulticaPoller({ dataDir: ctx.dataDir });
        state.up();
        await waitForAbort(ctx.signal);
      } catch (err) {
        state.down(err);
        throw err;
      } finally {
        stopMulticaPoller();
        if (ctx.signal.aborted) {
          state.down();
        }
      }
    },
    async stop() {
      stopMulticaPoller();
      state.down();
    },
    async reload() {
      state.starting();
      try {
        reloadMulticaPoller(dataDir ? { dataDir } : {});
        state.up();
      } catch (err) {
        state.down(err);
        throw err;
      }
    },
    health() {
      return state.health();
    },
  };
}

export const multicaPollerModule = createMulticaPollerModule();
