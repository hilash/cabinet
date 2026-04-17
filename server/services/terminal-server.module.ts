import type http from "http";
import {
  createServiceState,
  waitForAbort,
  type ServiceModule,
} from "../service-module";
import { LOOPBACK_HOST } from "../terminal-server-auth";

interface TerminalServerModuleOptions {
  port: number;
  server: http.Server;
  onStarted?: () => void;
}

export function createTerminalServerModule(
  options: TerminalServerModuleOptions,
): ServiceModule {
  const state = createServiceState();

  async function closeServer(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!options.server.listening) {
        resolve();
        return;
      }

      options.server.close(() => resolve());
    });
  }

  return {
    name: "terminal-server",
    async start(ctx) {
      state.starting();
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (err: Error) => {
            cleanup();
            reject(err);
          };

          const onAbort = () => {
            cleanup();
            resolve();
          };

          const cleanup = () => {
            options.server.off("error", onError);
            ctx.signal.removeEventListener("abort", onAbort);
          };

          if (ctx.signal.aborted) {
            resolve();
            return;
          }

          options.server.once("error", onError);
          ctx.signal.addEventListener("abort", onAbort, { once: true });

          options.server.listen(options.port, LOOPBACK_HOST, () => {
            cleanup();
            options.onStarted?.();
            state.up();
            resolve();
          });
        });

        if (ctx.signal.aborted) {
          state.down();
          return;
        }

        await waitForAbort(ctx.signal);
      } catch (err) {
        state.down(err);
        throw err;
      } finally {
        await closeServer();
        if (ctx.signal.aborted) {
          state.down();
        }
      }
    },
    async stop() {
      await closeServer();
      state.down();
    },
    health() {
      return state.health();
    },
  };
}
