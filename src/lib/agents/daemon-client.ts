import { getDaemonUrl, getOrCreateDaemonToken } from "./daemon-auth";

interface CreateDaemonSessionInput {
  id: string;
  prompt: string;
  cwd?: string;
  timeoutSeconds?: number;
  headless?: boolean;
}

async function daemonFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getOrCreateDaemonToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${getDaemonUrl()}${path}`, {
    ...init,
    headers,
  });
}

export async function createDaemonSession(
  input: CreateDaemonSessionInput
): Promise<void> {
  const response = await daemonFetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create daemon session (${response.status})`);
  }
}

export async function getDaemonSessionOutput(id: string): Promise<{
  status: string;
  output: string;
}> {
  const response = await daemonFetch(`/session/${id}/output`);
  if (!response.ok) {
    throw new Error(`Failed to load daemon session output (${response.status})`);
  }
  return response.json() as Promise<{ status: string; output: string }>;
}

export async function listDaemonSessions(): Promise<
  { id: string; createdAt: string; connected: boolean; exited: boolean; exitCode: number | null }[]
> {
  const response = await daemonFetch("/sessions");
  if (!response.ok) {
    throw new Error(`Failed to list daemon sessions (${response.status})`);
  }
  return response.json() as Promise<
    { id: string; createdAt: string; connected: boolean; exited: boolean; exitCode: number | null }[]
  >;
}

export async function reloadDaemonSchedules(): Promise<void> {
  const response = await daemonFetch("/reload-schedules", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to reload daemon schedules (${response.status})`);
  }
}
