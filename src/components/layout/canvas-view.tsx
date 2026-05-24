"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { useEditorStore } from "@/stores/editor-store";
import { ROOT_CABINET_PATH } from "@/lib/cabinets/paths";
import { findNodeByPath } from "@/lib/cabinets/tree";
import { fetchPage } from "@/lib/api/client";
import type { TreeNode } from "@/types";
import { useLocale } from "@/i18n/use-locale";

type CardSize = { width: number; height: number };
type CardPosition = { x: number; y: number };
type CanvasSnapshot = {
  whiteboardCardSizes?: Record<string, CardSize>;
  whiteboardCardPositions?: Record<string, CardPosition>;
  whiteboardCardPositionsByBoardPath?: Record<string, Record<string, CardPosition>>;
  whiteboardCardPositionsCenteredByBoardPath?: Record<string, boolean>;
  whiteboardCardPositionsCenterVersionByBoardPath?: Record<string, number>;
  whiteboardZoom?: number;
  whiteboardManualResizedByPath?: Record<string, boolean>;
  whiteboardAutoSizedByPath?: Record<string, boolean>;
};
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type ResizeState = {
  path: string;
  handle: ResizeHandle;
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};
type DragState = {
  path: string;
  pointerId: number;
  startX: number;
  startY: number;
  startCardX: number;
  startCardY: number;
  moved: boolean;
};
type PanState = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
};
type AutoSizeState = {
  path: string;
  width: number;
  height: number;
};

const CARD_MIN_WIDTH = 240;
const CARD_MAX_WIDTH = 980;
const CARD_MIN_HEIGHT = 120;
const CARD_MAX_HEIGHT = 900;
const CARD_DEFAULT_WIDTH = 360;
const CARD_DEFAULT_HEIGHT = 320;
const CARD_BODY_VERTICAL_OVERHEAD = 110;
const CARD_CANVAS_GAP = 16;
const CARD_CANVAS_COLUMNS = 3;
const WHITEBOARD_MIN_ZOOM = 0.5;
const WHITEBOARD_MAX_ZOOM = 2;
const WHITEBOARD_DEFAULT_ZOOM = 1;
const WHITEBOARD_CANVAS_BASE_SIZE = 12000;
const WHITEBOARD_CANVAS_ORIGIN_OFFSET = WHITEBOARD_CANVAS_BASE_SIZE / 2;
const WHITEBOARD_CENTER_VERSION = 3;

function isCardSize(value: unknown): value is CardSize {
  if (!value || typeof value !== "object") return false;
  const next = value as { width?: unknown; height?: unknown };
  return typeof next.width === "number" && typeof next.height === "number";
}

function isCardPosition(value: unknown): value is CardPosition {
  if (!value || typeof value !== "object") return false;
  const next = value as { x?: unknown; y?: unknown };
  return typeof next.x === "number" && typeof next.y === "number";
}

function isFolderObject(node: TreeNode): boolean {
  return node.type === "directory" || node.type === "cabinet";
}

function isPreviewFile(node: TreeNode): boolean {
  return (
    node.type === "file" ||
    node.type === "image" ||
    node.type === "video" ||
    node.type === "pdf" ||
    node.type === "csv"
  );
}

function isCardObject(node: TreeNode): boolean {
  return isPreviewFile(node) || isFolderObject(node);
}

function getNodeKind(node: TreeNode): "cabinet" | "link-repo" | "page" {
  if (node.type === "cabinet") return "cabinet";
  if (node.hasRepo) return "link-repo";
  return "page";
}

function isComposedCard(node: TreeNode): boolean {
  if (node.type === "cabinet") return true;
  if (node.hasRepo) return true;
  if (!isFolderObject(node)) return false;
  return (node.children ?? []).some(isCardObject);
}

function getBoardNode(
  nodes: TreeNode[],
  selectedPath: string | null,
  fallbackPath: string
): TreeNode | null {
  if (selectedPath) {
    const selected = findNodeByPath(nodes, selectedPath);
    if (selected && isCardObject(selected)) return selected;
  }
  const fallback = findNodeByPath(nodes, fallbackPath);
  if (fallback && isCardObject(fallback)) return fallback;
  return null;
}

function assetUrl(nodePath: string): string {
  return `/api/assets/${nodePath.split("/").map(encodeURIComponent).join("/")}`;
}

function parseCsvPreview(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(current);
      current = "";
      continue;
    }

    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(current);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = "";
      if (ch === "\r") i++;
      if (rows.length >= 6) break;
      continue;
    }

    current += ch;
  }

  if (rows.length < 6) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows.map((r) => r.slice(0, 4));
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function makeScopedCardKey(boardPath: string, nodePath: string): string {
  return `${boardPath}::${nodePath}`;
}

function getDefaultCardPosition(index: number): CardPosition {
  const column = index % CARD_CANVAS_COLUMNS;
  const row = Math.floor(index / CARD_CANVAS_COLUMNS);
  const rowWidth = CARD_CANVAS_COLUMNS * CARD_DEFAULT_WIDTH + (CARD_CANVAS_COLUMNS - 1) * CARD_CANVAS_GAP;
  const startX = WHITEBOARD_CANVAS_ORIGIN_OFFSET - Math.round(rowWidth / 2);
  const startY = WHITEBOARD_CANVAS_ORIGIN_OFFSET - Math.round(CARD_DEFAULT_HEIGHT / 2);
  return {
    x: startX + column * (CARD_DEFAULT_WIDTH + CARD_CANVAS_GAP),
    y: startY + row * (CARD_DEFAULT_HEIGHT + CARD_CANVAS_GAP),
  };
}

function applyResize(
  handle: ResizeHandle,
  startWidth: number,
  startHeight: number,
  deltaX: number,
  deltaY: number
): CardSize {
  let width = startWidth;
  let height = startHeight;

  if (handle.includes("e")) width = startWidth + deltaX;
  if (handle.includes("w")) width = startWidth - deltaX;
  if (handle.includes("s")) height = startHeight + deltaY;
  if (handle.includes("n")) height = startHeight - deltaY;

  return {
    width: clamp(Math.round(width), CARD_MIN_WIDTH, CARD_MAX_WIDTH),
    height: clamp(Math.round(height), CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
  };
}

function fitCardSizeToContent(
  node: TreeNode,
  content: string,
  measuredWidth: number,
  measuredHeight: number,
  currentSize: CardSize
): CardSize {
  if (node.type === "pdf") {
    return {
      width: clamp(Math.round(currentSize.width), CARD_MIN_WIDTH, CARD_MAX_WIDTH),
      height: clamp(Math.round(currentSize.height), CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
    };
  }

  if (node.type === "image" && measuredWidth > 0 && measuredHeight > 0) {
    const targetWidth = clamp(Math.round(currentSize.width), CARD_MIN_WIDTH, CARD_MAX_WIDTH);
    const scaledHeight = Math.round((measuredHeight / measuredWidth) * targetWidth);
    return {
      width: targetWidth,
      height: clamp(scaledHeight + CARD_BODY_VERTICAL_OVERHEAD, CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
    };
  }

  if (node.type === "video" && measuredWidth > 0 && measuredHeight > 0) {
    const targetWidth = clamp(Math.round(currentSize.width), CARD_MIN_WIDTH, CARD_MAX_WIDTH);
    const scaledHeight = Math.round((measuredHeight / measuredWidth) * targetWidth);
    return {
      width: targetWidth,
      height: clamp(scaledHeight + CARD_BODY_VERTICAL_OVERHEAD, CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
    };
  }

  if ((node.type === "csv" || node.type === "file") && content.length > 0) {
    const lines = content.split(/\r?\n/);
    const visibleLines = Math.min(18, lines.length);
    const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const widthFromChars = Math.round(longestLine * 7.4 + 68);
    const heightFromLines = Math.round(visibleLines * 20 + 28);
    return {
      width: clamp(widthFromChars, CARD_MIN_WIDTH, CARD_MAX_WIDTH),
      height: clamp(heightFromLines + CARD_BODY_VERTICAL_OVERHEAD, CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
    };
  }

  if (measuredWidth > 0 && measuredHeight > 0) {
    return {
      width: clamp(Math.round(Math.max(currentSize.width, measuredWidth + 24)), CARD_MIN_WIDTH, CARD_MAX_WIDTH),
      height: clamp(Math.round(Math.max(currentSize.height, measuredHeight + CARD_BODY_VERTICAL_OVERHEAD)), CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
    };
  }

  return currentSize;
}

function CardPreview({
  node,
  content,
  title,
  onMediaMeasure,
}: {
  node: TreeNode;
  content: string;
  title: string;
  onMediaMeasure?: (size: AutoSizeState) => void;
}) {
  if (node.type === "image") {
    return (
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-muted/40">
        <img
          src={assetUrl(node.path)}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
          onLoad={(event) => {
            const img = event.currentTarget;
            onMediaMeasure?.({ path: node.path, width: img.naturalWidth, height: img.naturalHeight });
          }}
        />
      </div>
    );
  }

  if (node.type === "video") {
    return (
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-black/80">
        <video
          src={assetUrl(node.path)}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            const media = event.currentTarget;
            onMediaMeasure?.({ path: node.path, width: media.videoWidth, height: media.videoHeight });
          }}
        />
      </div>
    );
  }

  if (node.type === "pdf") {
    return (
      <iframe
        src={`${assetUrl(node.path)}#toolbar=0&navpanes=0`}
        title={title}
        className="min-h-0 flex-1 rounded-lg border-0 bg-muted/40"
      />
    );
  }

  if (node.type === "csv") {
    const rows = parseCsvPreview(content);
    if (rows.length > 0) {
      return (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted/40 p-2">
          <table className="w-full table-fixed border-collapse text-left text-[11px]">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${node.path}-row-${rowIndex}`} className={rowIndex === 0 ? "font-medium" : ""}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${node.path}-cell-${rowIndex}-${cellIndex}`}
                      className="max-w-0 truncate border border-border/50 px-1.5 py-1 align-top"
                      title={cell}
                    >
                      {cell || "\u00A0"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  return (
    <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg bg-muted/40 p-3 text-xs text-foreground/90">
      {content}
    </pre>
  );
}

export function CanvasView() {
  const { t } = useLocale();
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const nodes = useTreeStore((s) => s.nodes);
  const selectedPath = useTreeStore((s) => s.selectedPath);
  const selectPage = useTreeStore((s) => s.selectPage);
  const loadPage = useEditorStore((s) => s.loadPage);

  const cabinetPath = section.cabinetPath || ROOT_CABINET_PATH;
  const boardNode = useMemo(
    () => getBoardNode(nodes, selectedPath, cabinetPath),
    [nodes, selectedPath, cabinetPath]
  );

  const boardCards = useMemo(() => {
    if (!boardNode) return [] as TreeNode[];
    if (!isFolderObject(boardNode)) return [boardNode];
    return [boardNode, ...(boardNode.children ?? []).filter(isCardObject)];
  }, [boardNode]);
  const boardScopePath = boardNode?.path ?? cabinetPath;

  const [pageContentByPath, setPageContentByPath] = useState<Record<string, string>>({});
  const [cardSizeByPath, setCardSizeByPath] = useState<Record<string, CardSize>>({});
  const [cardPositionByPath, setCardPositionByPath] = useState<Record<string, CardPosition>>({});
  const [cardPositionsByBoardPath, setCardPositionsByBoardPath] = useState<Record<string, Record<string, CardPosition>>>({});
  const [positionsCenteredByBoardPath, setPositionsCenteredByBoardPath] = useState<Record<string, boolean>>({});
  const [positionCenterVersionByBoardPath, setPositionCenterVersionByBoardPath] = useState<Record<string, number>>({});
  const [manualResizedByPath, setManualResizedByPath] = useState<Record<string, boolean>>({});
  const [autoSizedByPath, setAutoSizedByPath] = useState<Record<string, boolean>>({});
  const [mediaSizeByPath, setMediaSizeByPath] = useState<Record<string, AutoSizeState>>({});
  const [sizesLoaded, setSizesLoaded] = useState(false);
  const [persistTick, setPersistTick] = useState(0);
  const [boardZoom, setBoardZoom] = useState(WHITEBOARD_DEFAULT_ZOOM);
  const resizingRef = useRef<ResizeState | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  const panningRef = useRef<PanState | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const suppressNextCardClickRef = useRef(false);
  const didCenterBoardRef = useRef(false);

  useEffect(() => {
    didCenterBoardRef.current = false;
  }, [boardScopePath]);

  useEffect(() => {
    if (!sizesLoaded || didCenterBoardRef.current) return;
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    scrollArea.scrollLeft = Math.max(0, (scrollArea.scrollWidth - scrollArea.clientWidth) / 2);
    scrollArea.scrollTop = Math.max(0, (scrollArea.scrollHeight - scrollArea.clientHeight) / 2);
    didCenterBoardRef.current = true;
  }, [sizesLoaded, boardScopePath, boardZoom]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const query = new URLSearchParams();
        query.set("cabinetPath", cabinetPath);
        const res = await fetch(`/api/canvas?${query.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setCardSizeByPath({});
            setCardPositionByPath({});
            setCardPositionsByBoardPath({});
            setPositionsCenteredByBoardPath({});
            setPositionCenterVersionByBoardPath({});
            setManualResizedByPath({});
            setAutoSizedByPath({});
            setBoardZoom(WHITEBOARD_DEFAULT_ZOOM);
            setSizesLoaded(true);
          }
          return;
        }
        const snapshot = (await res.json()) as CanvasSnapshot;
        const nextSizes: Record<string, CardSize> = {};
        const nextPositions: Record<string, CardPosition> = {};
        const nextPositionsByBoardPath: Record<string, Record<string, CardPosition>> = {};
        const nextManual: Record<string, boolean> = {};
        const nextAuto: Record<string, boolean> = {};
        const nextCenteredByBoardPath: Record<string, boolean> =
          snapshot.whiteboardCardPositionsCenteredByBoardPath &&
          typeof snapshot.whiteboardCardPositionsCenteredByBoardPath === "object"
            ? Object.fromEntries(
                Object.entries(snapshot.whiteboardCardPositionsCenteredByBoardPath).filter(
                  ([, value]) => value === true
                )
              )
            : {};
        const nextCenterVersionByBoardPath: Record<string, number> =
          snapshot.whiteboardCardPositionsCenterVersionByBoardPath &&
          typeof snapshot.whiteboardCardPositionsCenterVersionByBoardPath === "object"
            ? Object.fromEntries(
                Object.entries(snapshot.whiteboardCardPositionsCenterVersionByBoardPath)
                  .filter(([, value]) => typeof value === "number")
                  .map(([path, value]) => [path, Math.floor(value as number)])
              )
            : {};

        if (snapshot.whiteboardCardSizes && typeof snapshot.whiteboardCardSizes === "object") {
          for (const [path, size] of Object.entries(snapshot.whiteboardCardSizes)) {
            if (!isCardSize(size)) continue;
            nextSizes[path] = {
              width: clamp(Math.round(size.width), CARD_MIN_WIDTH, CARD_MAX_WIDTH),
              height: clamp(Math.round(size.height), CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
            };
          }
        }
        if (snapshot.whiteboardCardPositions && typeof snapshot.whiteboardCardPositions === "object") {
          for (const [path, position] of Object.entries(snapshot.whiteboardCardPositions)) {
            if (!isCardPosition(position)) continue;
            nextPositions[path] = {
              x: Math.round(position.x),
              y: Math.round(position.y),
            };
          }
        }
        if (snapshot.whiteboardCardPositionsByBoardPath && typeof snapshot.whiteboardCardPositionsByBoardPath === "object") {
          for (const [boardPath, boardPositions] of Object.entries(snapshot.whiteboardCardPositionsByBoardPath)) {
            if (!boardPositions || typeof boardPositions !== "object") continue;
            const nextBoardPositions: Record<string, CardPosition> = {};
            for (const [path, position] of Object.entries(boardPositions)) {
              if (!isCardPosition(position)) continue;
              nextBoardPositions[path] = {
                x: Math.round(position.x),
                y: Math.round(position.y),
              };
            }
            if (Object.keys(nextBoardPositions).length > 0) {
              nextPositionsByBoardPath[boardPath] = nextBoardPositions;
            }
          }
        }
        if (snapshot.whiteboardManualResizedByPath && typeof snapshot.whiteboardManualResizedByPath === "object") {
          for (const [path, value] of Object.entries(snapshot.whiteboardManualResizedByPath)) {
            if (value === true) nextManual[path] = true;
          }
        }
        if (snapshot.whiteboardAutoSizedByPath && typeof snapshot.whiteboardAutoSizedByPath === "object") {
          for (const [path, value] of Object.entries(snapshot.whiteboardAutoSizedByPath)) {
            if (value === true) nextAuto[path] = true;
          }
        }
        for (const [path, size] of Object.entries(nextSizes)) {
          if (nextManual[path] || nextAuto[path]) continue;
          if (size.width !== CARD_DEFAULT_WIDTH || size.height !== CARD_DEFAULT_HEIGHT) {
            nextManual[path] = true;
          }
        }
        const persistedZoom =
          typeof snapshot.whiteboardZoom === "number"
            ? clamp(snapshot.whiteboardZoom, WHITEBOARD_MIN_ZOOM, WHITEBOARD_MAX_ZOOM)
            : WHITEBOARD_DEFAULT_ZOOM;
        const resolvedBoardPositions =
          nextPositionsByBoardPath[boardScopePath] ??
          (Object.keys(nextPositions).length > 0 ? nextPositions : {});
        const resolvedPositionsByBoardPath = { ...nextPositionsByBoardPath };
        if (!resolvedPositionsByBoardPath[boardScopePath]) {
          resolvedPositionsByBoardPath[boardScopePath] = resolvedBoardPositions;
        }
        const nextSizesScoped: Record<string, CardSize> = {};
        const nextManualScoped: Record<string, boolean> = {};
        const nextAutoScoped: Record<string, boolean> = {};
        for (const [path, size] of Object.entries(nextSizes)) {
          const key = path.includes("::") ? path : makeScopedCardKey(boardScopePath, path);
          nextSizesScoped[key] = size;
        }
        for (const [path, value] of Object.entries(nextManual)) {
          if (!value) continue;
          const key = path.includes("::") ? path : makeScopedCardKey(boardScopePath, path);
          nextManualScoped[key] = true;
        }
        for (const [path, value] of Object.entries(nextAuto)) {
          if (!value) continue;
          const key = path.includes("::") ? path : makeScopedCardKey(boardScopePath, path);
          nextAutoScoped[key] = true;
        }
        if (!cancelled) {
          setCardSizeByPath(nextSizesScoped);
          setCardPositionsByBoardPath(resolvedPositionsByBoardPath);
          setCardPositionByPath(resolvedPositionsByBoardPath[boardScopePath] ?? {});
          setPositionsCenteredByBoardPath(nextCenteredByBoardPath);
          setPositionCenterVersionByBoardPath(nextCenterVersionByBoardPath);
          setManualResizedByPath(nextManualScoped);
          setAutoSizedByPath(nextAutoScoped);
          setBoardZoom(persistedZoom);
          setSizesLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCardSizeByPath({});
          setCardPositionByPath({});
          setCardPositionsByBoardPath({});
          setPositionsCenteredByBoardPath({});
          setPositionCenterVersionByBoardPath({});
          setManualResizedByPath({});
          setAutoSizedByPath({});
          setBoardZoom(WHITEBOARD_DEFAULT_ZOOM);
          setSizesLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cabinetPath]);

  useEffect(() => {
    setCardSizeByPath((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const node of boardCards) {
        const scopedPath = makeScopedCardKey(boardScopePath, node.path);
        if (next[scopedPath]) continue;
        next[scopedPath] =
          prev[node.path] ?? {
            width: CARD_DEFAULT_WIDTH,
            height: CARD_DEFAULT_HEIGHT,
          };
        changed = true;
      }
      return changed ? next : prev;
    });
    setManualResizedByPath((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const node of boardCards) {
        const scopedPath = makeScopedCardKey(boardScopePath, node.path);
        if (next[scopedPath]) continue;
        if (prev[node.path]) {
          next[scopedPath] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setAutoSizedByPath((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const node of boardCards) {
        const scopedPath = makeScopedCardKey(boardScopePath, node.path);
        if (next[scopedPath]) continue;
        if (prev[node.path]) {
          next[scopedPath] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setMediaSizeByPath((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const node of boardCards) {
        const scopedPath = makeScopedCardKey(boardScopePath, node.path);
        if (next[scopedPath]) continue;
        const existing = prev[node.path];
        if (existing) {
          next[scopedPath] = existing;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [boardCards, boardScopePath]);

  useEffect(() => {
    if (!sizesLoaded) return;
    const scoped = cardPositionsByBoardPath[boardScopePath] ?? {};
    setCardPositionByPath((prev) => {
      const next: Record<string, CardPosition> = {};
      let changed = false;
      boardCards.forEach((node, index) => {
        const position = scoped[node.path] ?? getDefaultCardPosition(index);
        next[node.path] = position;
        const current = prev[node.path];
        if (!current || current.x !== position.x || current.y !== position.y) {
          changed = true;
        }
      });
      if (!changed && Object.keys(prev).length === Object.keys(next).length) {
        return prev;
      }
      return next;
    });
  }, [boardCards, boardScopePath, sizesLoaded]);

  useEffect(() => {
    if (!sizesLoaded || boardCards.length === 0) return;
    const currentCenterVersion = positionCenterVersionByBoardPath[boardScopePath] ?? 0;
    if (currentCenterVersion >= WHITEBOARD_CENTER_VERSION) return;
    const boardPositions = cardPositionsByBoardPath[boardScopePath] ?? {};
    const existingEntries = boardCards
      .map((node) => [node.path, boardPositions[node.path]] as const)
      .filter((entry): entry is readonly [string, CardPosition] => Boolean(entry[1]));
    if (existingEntries.length === 0) {
      setPositionsCenteredByBoardPath((prev) => ({ ...prev, [boardScopePath]: true }));
      setPositionCenterVersionByBoardPath((prev) => ({ ...prev, [boardScopePath]: WHITEBOARD_CENTER_VERSION }));
      return;
    }
    const xs = existingEntries.map(([, position]) => position.x);
    const ys = existingEntries.map(([, position]) => position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const looksLegacyTopLeft = minX >= 0 && minY >= 0 && maxX < 3000 && maxY < 3000;
    if (!looksLegacyTopLeft) {
      setPositionsCenteredByBoardPath((prev) => ({ ...prev, [boardScopePath]: true }));
      setPositionCenterVersionByBoardPath((prev) => ({ ...prev, [boardScopePath]: WHITEBOARD_CENTER_VERSION }));
      return;
    }
    const target = getDefaultCardPosition(0);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const deltaX = Math.round(target.x - centerX);
    const deltaY = Math.round(target.y - centerY);
    const shiftedBoardPositions: Record<string, CardPosition> = {};
    for (const node of boardCards) {
      const current = boardPositions[node.path];
      if (!current) continue;
      shiftedBoardPositions[node.path] = { x: current.x + deltaX, y: current.y + deltaY };
    }
    setCardPositionsByBoardPath((prev) => ({
      ...prev,
      [boardScopePath]: { ...prev[boardScopePath], ...shiftedBoardPositions },
    }));
    setCardPositionByPath((prev) => {
      const next = { ...prev };
      for (const [path, position] of Object.entries(shiftedBoardPositions)) {
        next[path] = position;
      }
      return next;
    });
    setPositionsCenteredByBoardPath((prev) => ({ ...prev, [boardScopePath]: true }));
    setPositionCenterVersionByBoardPath((prev) => ({ ...prev, [boardScopePath]: WHITEBOARD_CENTER_VERSION }));
    setPersistTick((tick) => tick + 1);
  }, [boardCards, boardScopePath, cardPositionsByBoardPath, positionCenterVersionByBoardPath, sizesLoaded]);

  useEffect(() => {
    if (!sizesLoaded) return;
    setCardPositionsByBoardPath((prev) => {
      const currentBoardPositions = prev[boardScopePath] ?? {};
      const nextBoardPositions: Record<string, CardPosition> = {};
      let changed = false;
      boardCards.forEach((node, index) => {
        const position = cardPositionByPath[node.path] ?? currentBoardPositions[node.path] ?? getDefaultCardPosition(index);
        nextBoardPositions[node.path] = position;
        const current = currentBoardPositions[node.path];
        if (!current || current.x !== position.x || current.y !== position.y) {
          changed = true;
        }
      });
      if (!changed && Object.keys(currentBoardPositions).length === Object.keys(nextBoardPositions).length) {
        return prev;
      }
      return { ...prev, [boardScopePath]: nextBoardPositions };
    });
  }, [boardCards, boardScopePath, cardPositionByPath, sizesLoaded]);

  useEffect(() => {
    if (!sizesLoaded) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const query = new URLSearchParams();
          query.set("cabinetPath", cabinetPath);
          const getRes = await fetch(`/api/canvas?${query.toString()}`, { cache: "no-store" });
          let snapshot: CanvasSnapshot = {};
          if (getRes.ok) {
            const data = await getRes.json();
            if (data && typeof data === "object") snapshot = data as CanvasSnapshot;
          }
          snapshot.whiteboardCardSizes = cardSizeByPath;
          snapshot.whiteboardCardPositions = cardPositionByPath;
          snapshot.whiteboardCardPositionsByBoardPath = cardPositionsByBoardPath;
          snapshot.whiteboardCardPositionsCenteredByBoardPath = positionsCenteredByBoardPath;
          snapshot.whiteboardCardPositionsCenterVersionByBoardPath = positionCenterVersionByBoardPath;
          snapshot.whiteboardManualResizedByPath = manualResizedByPath;
          snapshot.whiteboardAutoSizedByPath = autoSizedByPath;
          snapshot.whiteboardZoom = boardZoom;
          if (!cancelled) {
            await fetch(`/api/canvas?${query.toString()}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(snapshot),
            });
          }
        } catch {
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cardSizeByPath, cardPositionByPath, cardPositionsByBoardPath, positionsCenteredByBoardPath, positionCenterVersionByBoardPath, manualResizedByPath, autoSizedByPath, cabinetPath, sizesLoaded, persistTick, boardZoom]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const activeResize = resizingRef.current;
      if (activeResize) {
        if (event.pointerId !== activeResize.pointerId) return;
        suppressNextCardClickRef.current = true;
        const deltaX = event.clientX - activeResize.startX;
        const deltaY = event.clientY - activeResize.startY;
        const nextSize = applyResize(
          activeResize.handle,
          activeResize.startWidth,
          activeResize.startHeight,
          deltaX,
          deltaY
        );
        setCardSizeByPath((prev) => {
          const scopedPath = makeScopedCardKey(boardScopePath, activeResize.path);
          const current = prev[scopedPath] ?? prev[activeResize.path];
          if (current && current.width === nextSize.width && current.height === nextSize.height) {
            return prev;
          }
          return { ...prev, [scopedPath]: nextSize };
        });
        setManualResizedByPath((prev) => {
          const scopedPath = makeScopedCardKey(boardScopePath, activeResize.path);
          return prev[scopedPath] ? prev : { ...prev, [scopedPath]: true };
        });
        return;
      }

      const activePan = panningRef.current;
      if (activePan) {
        if (event.pointerId !== activePan.pointerId) return;
        const scrollArea = scrollAreaRef.current;
        if (!scrollArea) return;
        const deltaX = event.clientX - activePan.startX;
        const deltaY = event.clientY - activePan.startY;
        scrollArea.scrollLeft = activePan.startScrollLeft - deltaX;
        scrollArea.scrollTop = activePan.startScrollTop - deltaY;
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          suppressNextCardClickRef.current = true;
        }
        return;
      }

      const activeDrag = draggingRef.current;
      if (!activeDrag) return;
      const deltaX = Math.round((event.clientX - activeDrag.startX) / boardZoom);
      const deltaY = Math.round((event.clientY - activeDrag.startY) / boardZoom);
      if (!activeDrag.moved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        activeDrag.moved = true;
        suppressNextCardClickRef.current = true;
      }
      const nextX = activeDrag.startCardX + deltaX;
      const nextY = activeDrag.startCardY + deltaY;
      setCardPositionByPath((prev) => {
        const current = prev[activeDrag.path] ?? { x: activeDrag.startCardX, y: activeDrag.startCardY };
        if (current.x === nextX && current.y === nextY) return prev;
        return { ...prev, [activeDrag.path]: { x: nextX, y: nextY } };
      });
    };

    const stopInteractions = (event?: PointerEvent) => {
      const activeResize = resizingRef.current;
      if (activeResize && (!event || event.pointerId === activeResize.pointerId)) {
        resizingRef.current = null;
        setPersistTick((tick) => tick + 1);
      }

      const activeDrag = draggingRef.current;
      if (activeDrag && (!event || event.pointerId === activeDrag.pointerId)) {
        const moved = activeDrag.moved;
        draggingRef.current = null;
        if (moved) {
          setPersistTick((tick) => tick + 1);
        }
      }

      const activePan = panningRef.current;
      if (activePan && (!event || event.pointerId === activePan.pointerId)) {
        panningRef.current = null;
      }

      if (!resizingRef.current && !draggingRef.current && !panningRef.current && typeof document !== "undefined") {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopInteractions);
    window.addEventListener("pointercancel", stopInteractions);

    return () => {
      stopInteractions();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopInteractions);
      window.removeEventListener("pointercancel", stopInteractions);
    };
  }, [boardZoom, boardScopePath]);

  useEffect(() => {
    let cancelled = false;

    const contentPaths = boardCards
      .filter((node) => node.type === "file" || isFolderObject(node) || node.type === "csv")
      .slice(0, 300)
      .map((node) => node.path);

    if (contentPaths.length === 0) {
      setPageContentByPath({});
      return;
    }

    void (async () => {
      const entries = await Promise.all(
        contentPaths.map(async (nodePath) => {
          try {
            const data = await fetchPage(nodePath);
            return [nodePath, data.content] as const;
          } catch {
            if (!nodePath.toLowerCase().endsWith(".csv")) {
              return [nodePath, ""] as const;
            }
            try {
              const csvRes = await fetch(`/api/assets/${nodePath}`, { cache: "no-store" });
              if (!csvRes.ok) return [nodePath, ""] as const;
              return [nodePath, await csvRes.text()] as const;
            } catch {
              return [nodePath, ""] as const;
            }
          }
        })
      );

      if (cancelled) return;

      setPageContentByPath(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [boardCards]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-whiteboard-scroll-area='true']")) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setBoardZoom((prev) => clamp(Number((prev + direction * 0.08).toFixed(2)), WHITEBOARD_MIN_ZOOM, WHITEBOARD_MAX_ZOOM));
    };

    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    if (!sizesLoaded) return;
    setCardSizeByPath((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const node of boardCards) {
        const scopedPath = makeScopedCardKey(boardScopePath, node.path);
        if (manualResizedByPath[scopedPath] || autoSizedByPath[scopedPath]) continue;
        const currentSize = prev[scopedPath] ?? prev[node.path] ?? { width: CARD_DEFAULT_WIDTH, height: CARD_DEFAULT_HEIGHT };
        if (
          node.type === "pdf" &&
          (currentSize.width !== CARD_DEFAULT_WIDTH || currentSize.height !== CARD_DEFAULT_HEIGHT)
        ) {
          continue;
        }
        const measured = mediaSizeByPath[scopedPath] ?? mediaSizeByPath[node.path];
        const fitted = fitCardSizeToContent(
          node,
          pageContentByPath[node.path] ?? "",
          measured?.width ?? 0,
          measured?.height ?? 0,
          currentSize
        );
        if (fitted.width !== currentSize.width || fitted.height !== currentSize.height) {
          next[scopedPath] = fitted;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setAutoSizedByPath((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const node of boardCards) {
        const scopedPath = makeScopedCardKey(boardScopePath, node.path);
        if (manualResizedByPath[scopedPath] || next[scopedPath]) continue;
        const measured = mediaSizeByPath[scopedPath] ?? mediaSizeByPath[node.path];
        const hasText = (pageContentByPath[node.path] ?? "").length > 0;
        if (node.type === "image" || node.type === "video") {
          if (!measured || measured.width <= 0 || measured.height <= 0) continue;
        } else if (node.type === "csv" || node.type === "file" || node.type === "pdf") {
          if (!hasText && node.type !== "pdf") continue;
        }
        next[scopedPath] = true;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [boardCards, boardScopePath, pageContentByPath, mediaSizeByPath, manualResizedByPath, autoSizedByPath, sizesLoaded]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex min-h-0 flex-col">
        <div className="mb-4 flex flex-col gap-2 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">{t("editor:canvas.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("editor:canvas.openPage")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBoardZoom((prev) => clamp(prev - 0.1, WHITEBOARD_MIN_ZOOM, WHITEBOARD_MAX_ZOOM))}
              className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              -
            </button>
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {Math.round(boardZoom * 100)}%
            </div>
            <button
              type="button"
              onClick={() => setBoardZoom((prev) => clamp(prev + 0.1, WHITEBOARD_MIN_ZOOM, WHITEBOARD_MAX_ZOOM))}
              className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              +
            </button>
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {boardNode ? boardNode.path : cabinetPath === ROOT_CABINET_PATH ? "root" : cabinetPath}
            </div>
          </div>
        </div>

        <div
          ref={scrollAreaRef}
          className="flex-1 min-h-0 overflow-auto px-4 pb-4"
          data-whiteboard-scroll-area="true"
          onPointerDown={(event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest("button[data-canvas-card='true']")) return;
            panningRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              startScrollLeft: event.currentTarget.scrollLeft,
              startScrollTop: event.currentTarget.scrollTop,
            };
            if (typeof document !== "undefined") {
              document.body.style.cursor = "grabbing";
              document.body.style.userSelect = "none";
            }
          }}
        >
          {boardCards.length === 0 ? (
            <div className="mb-4 rounded-3xl border border-border/70 bg-muted p-8 text-center text-sm text-muted-foreground">
              {t("editor:canvas.empty")}
            </div>
          ) : (
            <div
              className="relative min-h-full"
              style={{
                transform: `scale(${boardZoom})`,
                transformOrigin: "top left",
                width: `${WHITEBOARD_CANVAS_BASE_SIZE}px`,
                height: `${WHITEBOARD_CANVAS_BASE_SIZE}px`,
              }}
            >
              {boardCards.map((node, index) => {
                const title = node.frontmatter?.title || node.name;
                const content = pageContentByPath[node.path] ?? "";
                const composed = isComposedCard(node);
                const kind = getNodeKind(node);
                const scopedPath = makeScopedCardKey(boardScopePath, node.path);

                return (
                  <button
                    key={node.path}
                    onPointerDown={(event) => {
                      const target = event.target;
                      if (target instanceof Element && target.closest("[data-resize-handle='true']")) {
                        return;
                      }
                      const position = cardPositionByPath[node.path] ?? getDefaultCardPosition(index);
                      draggingRef.current = {
                        path: node.path,
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        startCardX: position.x,
                        startCardY: position.y,
                        moved: false,
                      };
                      if (typeof document !== "undefined") {
                        document.body.style.cursor = "grabbing";
                        document.body.style.userSelect = "none";
                      }
                    }}
                    onClick={() => {
                      if (suppressNextCardClickRef.current) {
                        suppressNextCardClickRef.current = false;
                        return;
                      }
                      selectPage(node.path);
                      void loadPage(node.path);
                      if (composed && isFolderObject(node)) {
                        setSection({ type: "page", cabinetPath: node.path });
                      }
                    }}
                    style={{
                      width: cardSizeByPath[scopedPath]?.width ?? cardSizeByPath[node.path]?.width ?? CARD_DEFAULT_WIDTH,
                      height: cardSizeByPath[scopedPath]?.height ?? cardSizeByPath[node.path]?.height ?? CARD_DEFAULT_HEIGHT,
                      left: (cardPositionByPath[node.path] ?? getDefaultCardPosition(index)).x,
                      top: (cardPositionByPath[node.path] ?? getDefaultCardPosition(index)).y,
                    }}
                    className={
                      composed
                        ? "group absolute flex shrink-0 flex-col rounded-2xl border border-border/70 bg-muted/40 p-4 text-left transition-colors hover:bg-muted"
                        : "group absolute flex shrink-0 flex-col rounded-2xl border border-border/70 bg-background p-4 text-left transition-colors hover:bg-muted/40"
                    }
                    data-canvas-card="true"
                  >
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {composed ? `Composed ${kind}` : `Simple ${kind}`}
                    </div>
                    <div className="mb-2 line-clamp-2 text-base font-semibold">{title}</div>
                    <div className="mb-2 text-xs text-muted-foreground">{node.path}</div>
                    <CardPreview
                      node={node}
                      content={content}
                      title={title}
                      onMediaMeasure={(size) => {
                        const scopedPath = makeScopedCardKey(boardScopePath, size.path);
                        setMediaSizeByPath((prev) => {
                          const current = prev[scopedPath] ?? prev[size.path];
                          if (current && current.width === size.width && current.height === size.height) {
                            return prev;
                          }
                          return { ...prev, [scopedPath]: { ...size, path: scopedPath } };
                        });
                      }}
                    />
                    {([
                      ["n", "ns-resize", "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-10"],
                      ["s", "ns-resize", "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-2.5 w-10"],
                      ["e", "ew-resize", "right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-10 w-2.5"],
                      ["w", "ew-resize", "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-2.5"],
                      ["ne", "nesw-resize", "right-0 top-0 translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5"],
                      ["nw", "nwse-resize", "left-0 top-0 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5"],
                      ["se", "nwse-resize", "right-0 bottom-0 translate-x-1/2 translate-y-1/2 h-3.5 w-3.5"],
                      ["sw", "nesw-resize", "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 h-3.5 w-3.5"],
                    ] as const).map(([handle, cursor, placement]) => (
                      <span
                        key={`${node.path}-${handle}`}
                        role="presentation"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const size = cardSizeByPath[scopedPath] ?? cardSizeByPath[node.path] ?? {
                            width: CARD_DEFAULT_WIDTH,
                            height: CARD_DEFAULT_HEIGHT,
                          };
                          resizingRef.current = {
                            path: node.path,
                            handle,
                            pointerId: event.pointerId,
                            startX: event.clientX,
                            startY: event.clientY,
                            startWidth: size.width,
                            startHeight: size.height,
                          };
                          if (typeof document !== "undefined") {
                            document.body.style.cursor = cursor;
                            document.body.style.userSelect = "none";
                          }
                        }}
                        className={`absolute z-10 rounded-full border border-border/70 bg-background/95 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 ${placement}`}
                        style={{ cursor }}
                        data-resize-handle="true"
                      />
                    ))}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
