import { reloadTelegramBot, startTelegramBot, stopTelegramBot } from "../telegram-bot";
import { loadCabinetConfig } from "../../src/lib/config/cabinet-config";
import {
  createServiceState,
  waitForAbort,
  type ServiceModule,
} from "../service-module";

interface TelegramModuleOptions {
  waitUntilReady?: (signal: AbortSignal) => Promise<void>;
}

export function createTelegramModule(options: TelegramModuleOptions = {}): ServiceModule {
  const state = createServiceState();
  let dataDir: string | null = null;

  return {
    name: "telegram-bot",
    async start(ctx) {
      state.starting();
      try {
        await options.waitUntilReady?.(ctx.signal);
        if (ctx.signal.aborted) {
          state.down();
          return;
        }

        dataDir = ctx.dataDir;
        await startTelegramBot({
          dataDir: ctx.dataDir,
          cabinetConfig: ctx.config,
        });
        state.up();
        await waitForAbort(ctx.signal);
      } catch (err) {
        state.down(err);
        throw err;
      } finally {
        stopTelegramBot();
        if (ctx.signal.aborted) {
          state.down();
        }
      }
    },
    async stop() {
      stopTelegramBot();
      state.down();
    },
    async reload() {
      state.starting();
      try {
        if (!dataDir) {
          await reloadTelegramBot();
        } else {
          await reloadTelegramBot({
            dataDir,
            cabinetConfig: await loadCabinetConfig(dataDir),
          });
        }
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

export const telegramModule = createTelegramModule();
