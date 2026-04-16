import path from "path";
import { spawn } from "child_process";

const PROJECT_ROOT = process.cwd();
const standaloneServer = path.join(PROJECT_ROOT, ".next", "standalone", "server.js");

const child = spawn(process.execPath, [standaloneServer, ...process.argv.slice(2)], {
  cwd: PROJECT_ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    CABINET_PROJECT_ROOT: PROJECT_ROOT,
    CABINET_DATA_DIR:
      process.env.CABINET_DATA_DIR || path.join(PROJECT_ROOT, "data"),
  },
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
