"use client";

import { useEffect, useRef, useState } from "react";

interface WebTerminalProps {
  sessionId?: string;
  prompt?: string;
  displayPrompt?: string;
  reconnect?: boolean; // If true, connect without sending prompt (session already exists on server)
  themeSurface?: "terminal" | "page";
  onClose: () => void;
}

interface DaemonAuthPayload {
  token: string;
  wsOrigin?: string;
}

function readRootVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function getTerminalTheme(themeSurface: "terminal" | "page" = "terminal") {
  const backgroundVar = themeSurface === "page" ? "--background" : "--terminal-bg";
  const foregroundVar = themeSurface === "page" ? "--foreground" : "--terminal-fg";
  const background = readRootVar(backgroundVar, "#0a0a0a");
  const foreground = readRootVar(foregroundVar, "#e5e5e5");

  return {
    background,
    foreground,
    cursor: readRootVar("--terminal-cursor", foreground),
    cursorAccent: background,
    selectionBackground: readRootVar("--terminal-selection", "#ffffff30"),
    selectionForeground: foreground,
    black: readRootVar("--terminal-ansi-black", "#1a1a2e"),
    red: readRootVar("--terminal-ansi-red", "#ff6b6b"),
    green: readRootVar("--terminal-ansi-green", "#51cf66"),
    yellow: readRootVar("--terminal-ansi-yellow", "#ffd43b"),
    blue: readRootVar("--terminal-ansi-blue", "#74c0fc"),
    magenta: readRootVar("--terminal-ansi-magenta", "#cc5de8"),
    cyan: readRootVar("--terminal-ansi-cyan", "#66d9e8"),
    white: readRootVar("--terminal-ansi-white", foreground),
    brightBlack: readRootVar("--terminal-ansi-bright-black", "#555570"),
    brightRed: readRootVar("--terminal-ansi-bright-red", "#ff8787"),
    brightGreen: readRootVar("--terminal-ansi-bright-green", "#69db7c"),
    brightYellow: readRootVar("--terminal-ansi-bright-yellow", "#ffe066"),
    brightBlue: readRootVar("--terminal-ansi-bright-blue", "#91d5ff"),
    brightMagenta: readRootVar("--terminal-ansi-bright-magenta", "#da77f2"),
    brightCyan: readRootVar("--terminal-ansi-bright-cyan", "#99e9f2"),
    brightWhite: readRootVar("--terminal-ansi-bright-white", "#ffffff"),
  };
}

function replacePastedTextNotice(output: string, displayPrompt?: string): string {
  if (!displayPrompt) return output;
  return output.replace(/\[Pasted text #\d+(?: \+\d+ lines)?\]/g, displayPrompt);
}

export function WebTerminal({
  sessionId,
  prompt,
  displayPrompt,
  reconnect,
  themeSurface = "terminal",
  onClose,
}: WebTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let terminal: import("@xterm/xterm").Terminal | null = null;
    let ws: WebSocket | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let disposed = false;

    const init = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");
      const { Unicode11Addon } = await import("@xterm/addon-unicode11");

      // Import CSS
      await import("@xterm/xterm/css/xterm.css");

      if (disposed) return;

      terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 13,
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
        lineHeight: 1.2,
        letterSpacing: 0,
        theme: getTerminalTheme(themeSurface),
        scrollback: 10000,
        allowProposedApi: true,
        convertEol: false,
        altClickMovesCursor: true,
        drawBoldTextInBrightColors: true,
        minimumContrastRatio: 1,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      // Enable clickable links in output
      terminal.loadAddon(new WebLinksAddon());

      // Enable Unicode 11 for better emoji/icon rendering
      const unicode11Addon = new Unicode11Addon();
      terminal.loadAddon(unicode11Addon);
      terminal.unicode.activeVersion = "11";

      xtermRef.current = terminal;

      if (termRef.current) {
        const applyTheme = () => {
          if (!terminal) return;
          const nextTheme = getTerminalTheme(themeSurface);
          terminal.options.theme = nextTheme;
          termRef.current?.style.setProperty("background-color", nextTheme.background);
          termRef.current?.style.setProperty("color", nextTheme.foreground);
        };

        applyTheme();
        terminal.open(termRef.current);
        applyTheme();

        themeObserver = new MutationObserver(() => {
          requestAnimationFrame(() => {
            if (!disposed) {
              applyTheme();
            }
          });
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "style", "data-custom-theme"],
        });

        // Initial fit after a tick (ensures DOM is ready)
        requestAnimationFrame(() => {
          if (!disposed) {
            fitAddon.fit();
            connectWebSocket();
          }
        });

        // Handle resize
        resizeObserver = new ResizeObserver(() => {
          if (!disposed) {
            requestAnimationFrame(() => {
              if (!disposed) {
                fitAddon.fit();
                if (ws?.readyState === WebSocket.OPEN && terminal) {
                  ws.send(
                    JSON.stringify({
                      type: "resize",
                      cols: terminal.cols,
                      rows: terminal.rows,
                    })
                  );
                }
              }
            });
          }
        });
        resizeObserver.observe(termRef.current);
      }

      function connectWebSocket() {
        if (disposed || !terminal) return;

        void (async () => {
          const id = sessionId || `session-${Date.now()}`;

          try {
            const authResponse = await fetch("/api/daemon/auth");
            if (!authResponse.ok) {
              throw new Error(`Auth failed (${authResponse.status})`);
            }

            const auth = (await authResponse.json()) as DaemonAuthPayload;
            const params = new URLSearchParams({ id, token: auth.token });
            if (prompt && !reconnect) params.set("prompt", prompt);

            const wsOrigin =
              auth.wsOrigin ||
              (window.location.protocol === "https:"
                ? `wss://${window.location.host}`
                : `ws://${window.location.host}`);
            const wsUrl = `${wsOrigin}/api/daemon/pty?${params.toString()}`;

            ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.binaryType = "arraybuffer";

            ws.onopen = () => {
              if (disposed) return;
              setError(null);
              if (terminal) {
                ws?.send(
                  JSON.stringify({
                    type: "resize",
                    cols: terminal.cols,
                    rows: terminal.rows,
                  })
                );
              }
            };

            ws.onmessage = (event) => {
              if (disposed || !terminal) return;
              if (event.data instanceof ArrayBuffer) {
                terminal.write(new Uint8Array(event.data));
              } else {
                terminal.write(replacePastedTextNotice(event.data, displayPrompt));
              }
            };

            ws.onerror = () => {
              if (disposed) return;
              setError("Connection failed. Is the daemon running?");
              terminal?.write(
                "\r\n\x1b[31mConnection error.\x1b[0m Run \x1b[33mnpm run dev:all\x1b[0m to start Cabinet locally.\r\n"
              );
            };

            ws.onclose = () => {
              if (disposed) return;
              terminal?.write("\r\n\x1b[90m[Session ended]\x1b[0m\r\n");
              onCloseRef.current?.();
            };
          } catch {
            setError("Connection failed. Is the daemon running?");
            terminal?.write(
              "\r\n\x1b[31mConnection error.\x1b[0m Run \x1b[33mnpm run dev:all\x1b[0m to start Cabinet locally.\r\n"
            );
          }
        })();

        terminal.onData((data) => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });
      }
    };

    init();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      ws?.close();
      terminal?.dispose();
      wsRef.current = null;
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, prompt, displayPrompt, reconnect, themeSurface]);

  const surfaceBackground = themeSurface === "page" ? "var(--background)" : "var(--terminal-bg)";
  const surfaceForeground = themeSurface === "page" ? "var(--foreground)" : "var(--terminal-fg)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: surfaceBackground,
        color: surfaceForeground,
      }}
    >
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-destructive/90 text-destructive-foreground text-xs rounded-md">
          {error}
        </div>
      )}
      <div
        ref={termRef}
        className="h-full w-full overflow-hidden"
        style={{ padding: "4px 8px" }}
      />
    </div>
  );
}
