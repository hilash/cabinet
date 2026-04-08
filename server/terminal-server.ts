console.warn(
  "[deprecated] server/terminal-server.ts now delegates to server/cabinet-daemon.ts. Use `npm run dev:daemon` going forward."
);

import "./cabinet-daemon";
