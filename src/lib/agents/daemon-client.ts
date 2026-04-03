const DAEMON_URL = "http://localhost:3001";

interface CreateDaemonSessionInput {
  id: string;
  prompt: string;
  cwd?: string;
  timeoutSeconds?: number;
}

export async function createDaemonSession(
  input: CreateDaemonSessionInput
): Promise<void> {
  const response = await fetch(`${DAEMON_URL}/sessions`, {
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
  const response = await fetch(`${DAEMON_URL}/session/${id}/output`);
  if (!response.ok) {
    throw new Error(`Failed to load daemon session output (${response.status})`);
  }
  return response.json() as Promise<{ status: string; output: string }>;
}

export async function reloadDaemonSchedules(): Promise<void> {
  const response = await fetch(`${DAEMON_URL}/reload-schedules`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to reload daemon schedules (${response.status})`);
  }
}
