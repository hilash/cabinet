import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface EditorSession {
  id: string;
  sessionId: string;
  pagePath: string;
  userMessage: string;
  prompt: string;
  timestamp: number;
  status: "running" | "completed";
  reconnect?: boolean;  // true when restored from sessionStorage after refresh
}

const SESSION_STORAGE_KEY = "ai-panel-running-sessions";

function saveRunningSessionsToStorage(sessions: EditorSession[]) {
  try {
    const running = sessions.filter((s) => s.status === "running");
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(running));
  } catch {}
}

function loadRunningSessionsFromStorage(): EditorSession[] {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    const sessions: EditorSession[] = JSON.parse(raw);
    // Mark all restored sessions for reconnection
    return sessions.map((s) => ({ ...s, reconnect: true }));
  } catch {
    return [];
  }
}

interface AIPanelState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;

  // Live editor sessions (persist across page navigation)
  editorSessions: EditorSession[];

  open: () => void;
  close: () => void;
  toggle: () => void;
  addMessage: (role: "user" | "assistant", content: string) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;

  // Editor session management
  addEditorSession: (session: EditorSession) => void;
  markSessionCompleted: (sessionId: string) => void;
  removeSession: (sessionId: string) => void;
  clearSessionsForPage: (pagePath: string) => void;
  clearAllSessions: () => void;
  getSessionsForPage: (pagePath: string) => EditorSession[];
  getAllRunningSessions: () => EditorSession[];
  restoreSessionsFromStorage: () => void;
}

export const useAIPanelStore = create<AIPanelState>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  editorSessions: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role, content, timestamp: Date.now() },
      ],
    })),

  setLoading: (isLoading) => set({ isLoading }),
  clearMessages: () => set({ messages: [] }),

  addEditorSession: (session) =>
    set((s) => {
      const next = [...s.editorSessions, session];
      saveRunningSessionsToStorage(next);
      return { editorSessions: next };
    }),

  markSessionCompleted: (sessionId) =>
    set((s) => {
      const next = s.editorSessions.map((es) =>
        es.sessionId === sessionId ? { ...es, status: "completed" as const } : es
      );
      saveRunningSessionsToStorage(next);
      return { editorSessions: next };
    }),

  removeSession: (sessionId) =>
    set((s) => {
      const next = s.editorSessions.filter((es) => es.sessionId !== sessionId);
      saveRunningSessionsToStorage(next);
      return { editorSessions: next };
    }),

  clearSessionsForPage: (pagePath) =>
    set((s) => {
      const next = s.editorSessions.filter((es) => es.pagePath !== pagePath);
      saveRunningSessionsToStorage(next);
      return { editorSessions: next };
    }),

  clearAllSessions: () => {
    saveRunningSessionsToStorage([]);
    set({ editorSessions: [] });
  },

  getSessionsForPage: (pagePath) =>
    get().editorSessions.filter((es) => es.pagePath === pagePath),

  getAllRunningSessions: () =>
    get().editorSessions.filter((es) => es.status === "running"),

  restoreSessionsFromStorage: () => {
    const restored = loadRunningSessionsFromStorage();
    if (restored.length > 0) {
      set((s) => {
        // Only add sessions that aren't already in the store
        const existingIds = new Set(s.editorSessions.map((es) => es.sessionId));
        const newSessions = restored.filter((r) => !existingIds.has(r.sessionId));
        return { editorSessions: [...s.editorSessions, ...newSessions] };
      });
    }
  },
}));
