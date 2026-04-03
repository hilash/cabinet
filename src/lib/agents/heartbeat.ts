import { spawn } from "child_process";
import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  readPersona,
  readMemory,
  writeMemory,
  readInbox,
  clearInbox,
  recordHeartbeat,
  markHeartbeatRunning,
  markHeartbeatComplete,
  getHeartbeatHistory,
  type AgentPersona,
} from "./persona-manager";
import { readFileContent, fileExists } from "@/lib/storage/fs-operations";
import { autoCommit } from "@/lib/git/git-service";
import { listPlays } from "./play-manager";
import { postMessage } from "./slack-manager";
import { getGoalState, updateGoal } from "./goal-manager";

interface HeartbeatContext {
  prompt: string;
  persona: AgentPersona;
  inbox: Array<{ from: string; timestamp: string; message: string }>;
  cwd: string;
  startTime: number;
}

async function buildHeartbeatContext(slug: string): Promise<HeartbeatContext | null> {
  const startTime = Date.now();
  const persona = await readPersona(slug);
  if (!persona || !persona.active) return null;

  const context = await readMemory(slug, "context.md");
  const decisions = await readMemory(slug, "decisions.md");
  const learnings = await readMemory(slug, "learnings.md");

  const inbox = await readInbox(slug);
  const inboxText = inbox.length > 0
    ? inbox.map((m) => `**From ${m.from}** (${m.timestamp}):\n${m.message}`).join("\n\n---\n\n")
    : "(no new messages)";

  let focusContext = "";
  for (const focusPath of persona.focus) {
    const indexPath = path.join(DATA_DIR, focusPath, "index.md");
    if (await fileExists(indexPath)) {
      const content = await readFileContent(indexPath);
      focusContext += `\n### ${focusPath}\n${content.slice(0, 500)}...\n`;
    }
  }

  let playsContext = "";
  if (persona.plays && persona.plays.length > 0) {
    const allPlays = await listPlays();
    const assignedPlays = allPlays.filter((p) => persona.plays.includes(p.slug));
    if (assignedPlays.length > 0) {
      playsContext = assignedPlays.map((p) =>
        `- **${p.title}** (\`${p.slug}\`): ${p.body.slice(0, 200)}...`
      ).join("\n");
    }
  }

  let goalsContext = "";
  if (persona.goals && persona.goals.length > 0) {
    const goalState = await getGoalState(slug);
    goalsContext = persona.goals.map((g) => {
      const state = goalState[g.metric];
      const current = state?.current ?? g.current ?? 0;
      const pct = g.target > 0 ? Math.round((current / g.target) * 100) : 0;
      return `- **${g.metric}**: ${current}/${g.target} ${g.unit} (${pct}%)`;
    }).join("\n");
  }

  let tasksContext = "";
  try {
    const { getTasksForAgent } = await import("./task-inbox");
    const pendingTasks = await getTasksForAgent(slug, "pending");
    const inProgressTasks = await getTasksForAgent(slug, "in_progress");
    const allActive = [...pendingTasks, ...inProgressTasks];
    if (allActive.length > 0) {
      tasksContext = allActive.map((t) =>
        `- [${t.status.toUpperCase()}] **${t.title}** (from ${t.fromName || t.fromAgent}, priority ${t.priority})${t.description ? `: ${t.description}` : ""}`
      ).join("\n");
    }
  } catch { /* ignore */ }

  const prompt = `${persona.body}

---

## Your Memory (from previous heartbeats)

### Recent Context
${context || "(no previous context)"}

### Key Decisions
${decisions || "(no decisions logged yet)"}

### Learnings
${learnings || "(no learnings yet)"}

---

## Inbox (messages from other agents)
${inboxText}

---

## Focus Areas (recent state)
${focusContext || "(no focus areas configured)"}

---

## Your Assigned Plays
${playsContext || "(no plays assigned)"}

---

## Goal Progress
${goalsContext || "(no goals configured)"}

---

## Task Inbox (tasks from other agents)
${tasksContext || "(no pending tasks)"}

---

## Instructions for this heartbeat

1. Review your focus areas, inbox messages, and goal progress
2. Decide which plays to run based on schedules and goal status
3. Take action: edit KB pages, run plays, create/update tasks, or send messages to other agents
4. At the END of your response, include a structured section like this:

\`\`\`memory
CONTEXT_UPDATE: One paragraph summarizing what you did this heartbeat and key observations.
DECISION: (optional) Any key decision made, with reasoning.
LEARNING: (optional) Any new insight to remember long-term.
GOAL_UPDATE [metric_name]: +N (report progress on goals, e.g. GOAL_UPDATE [reddit_replies]: +3)
MESSAGE_TO [agent-slug]: (optional) A message to send to another agent.
SLACK [channel-name]: (optional) A message to post to Agent Slack. Use this to report your activity.
TASK_CREATE [target-agent-slug] [priority 1-5]: title | description (optional — create a structured task handoff to another agent)
TASK_COMPLETE [task-id]: result summary (mark a pending task as completed)
\`\`\`

Now execute your heartbeat. Check your focus areas, process inbox, review goals, and take action.`;

  const cwd = persona.workdir === "/data" ? DATA_DIR : path.join(DATA_DIR, persona.workdir);
  return { prompt, persona, inbox, cwd, startTime };
}

async function processHeartbeatOutput(
  slug: string,
  output: string,
  status: "completed" | "failed",
  persona: AgentPersona,
  inbox: Array<{ from: string; timestamp: string; message: string }>,
  startTime: number,
): Promise<void> {
  // Parse memory block from output
  const memoryMatch = output.match(/```memory\n([\s\S]*?)```/);
  if (memoryMatch) {
    const memoryBlock = memoryMatch[1];

    const contextUpdate = memoryBlock.match(/CONTEXT_UPDATE:\s*(.*)/);
    if (contextUpdate) {
      const timestamp = new Date().toISOString();
      const entry = `\n\n## ${timestamp}\n${contextUpdate[1].trim()}`;
      const existingContext = await readMemory(slug, "context.md");
      const entries = existingContext.split(/\n## \d{4}-/).filter(Boolean);
      const trimmed = entries.slice(-19).map((e, i) => i === 0 ? e : `## ${e.startsWith("20") ? "" : ""}${e}`).join("\n");
      await writeMemory(slug, "context.md", trimmed + entry);
    }

    const decision = memoryBlock.match(/DECISION:\s*(.*)/);
    if (decision && decision[1].trim()) {
      const timestamp = new Date().toISOString();
      const existingDecisions = await readMemory(slug, "decisions.md");
      await writeMemory(slug, "decisions.md",
        existingDecisions + `\n\n## ${timestamp}\n${decision[1].trim()}`
      );
    }

    const learning = memoryBlock.match(/LEARNING:\s*(.*)/);
    if (learning && learning[1].trim()) {
      const timestamp = new Date().toISOString();
      const existingLearnings = await readMemory(slug, "learnings.md");
      await writeMemory(slug, "learnings.md",
        existingLearnings + `\n\n## ${timestamp}\n${learning[1].trim()}`
      );
    }

    const messageMatches = memoryBlock.matchAll(/MESSAGE_TO\s+\[([^\]]+)\]:\s*(.*)/g);
    for (const match of messageMatches) {
      const { sendMessage } = await import("./persona-manager");
      await sendMessage(slug, match[1], match[2].trim());
    }

    const slackMatches = memoryBlock.matchAll(/SLACK\s+\[([^\]]+)\]:\s*(.*)/g);
    for (const match of slackMatches) {
      await postMessage({
        channel: match[1],
        agent: slug,
        emoji: persona.emoji,
        displayName: persona.name,
        type: "message",
        content: match[2].trim(),
        mentions: [],
        kbRefs: [],
      });
    }

    const goalMatches = memoryBlock.matchAll(/GOAL_UPDATE\s+\[([^\]]+)\]:\s*\+?(\d+)/g);
    for (const match of goalMatches) {
      const metric = match[1].trim();
      const increment = parseInt(match[2], 10);
      if (increment > 0) await updateGoal(slug, metric, increment);
    }

    const taskMatches = memoryBlock.matchAll(/TASK_CREATE\s+\[([^\]]+)\]\s*\[?(\d)?\]?:\s*([^|]+)(?:\|\s*(.*))?/g);
    for (const match of taskMatches) {
      const { createTask } = await import("./task-inbox");
      const toAgent = match[1].trim();
      const priority = match[2] ? parseInt(match[2], 10) : 3;
      const title = match[3].trim();
      const description = match[4]?.trim() || "";
      await createTask({
        fromAgent: slug, fromEmoji: persona.emoji, fromName: persona.name,
        toAgent, channel: persona.channels?.[0] || "general",
        title, description, kbRefs: [], priority,
      });
      await postMessage({
        channel: persona.channels?.[0] || "general",
        agent: slug, emoji: persona.emoji, displayName: persona.name,
        type: "task",
        content: `📋 Task created for **@${toAgent}**: ${title}${description ? ` — ${description}` : ""}`,
        mentions: [toAgent], kbRefs: [],
      });
    }

    const taskCompleteMatches = memoryBlock.matchAll(/TASK_COMPLETE\s+\[([^\]]+)\]:\s*(.*)/g);
    for (const match of taskCompleteMatches) {
      const { updateTask } = await import("./task-inbox");
      await updateTask(slug, match[1].trim(), { status: "completed", result: match[2].trim() });
    }
  }

  // Floor alerts
  if (persona.goals && persona.goals.length > 0) {
    const goalState = await getGoalState(slug);
    for (const g of persona.goals) {
      if (g.floor !== undefined && g.floor > 0) {
        const state = goalState[g.metric];
        const current = state?.current ?? g.current ?? 0;
        if (current < g.floor) {
          const periodEnd = state?.period_end;
          if (periodEnd) {
            const endDate = new Date(periodEnd).getTime();
            const periodStart = state?.period_start;
            const startDate = periodStart ? new Date(periodStart).getTime() : endDate - 7 * 86400000;
            const elapsed = Date.now() - startDate;
            if (elapsed / (endDate - startDate) >= 0.8) {
              await postMessage({
                channel: "alerts", agent: slug, emoji: persona.emoji, displayName: persona.name,
                type: "alert",
                content: `**${g.metric}** at ${current}/${g.target} (floor: ${g.floor}) with ${Math.round(((endDate - Date.now()) / 86400000))}d left. @human`,
                mentions: ["human"], kbRefs: [],
              });
            }
          }
        }
      }
    }
  }

  // Auto-post to channel
  if (status === "completed" && persona.channels && persona.channels.length > 0) {
    const summaryLine = output.slice(0, 300).split("\n")[0] || "Heartbeat completed";
    await postMessage({
      channel: persona.channels[0], agent: slug, emoji: persona.emoji, displayName: persona.name,
      type: "report", content: summaryLine, mentions: [], kbRefs: [],
    });
  }

  if (inbox.length > 0 && status === "completed") await clearInbox(slug);

  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  await recordHeartbeat({ agentSlug: slug, timestamp, duration, status, summary: output.slice(0, 500) });

  // Save full session output
  try {
    const sessionsDir = path.join(DATA_DIR, ".agents", slug, "sessions");
    const fs = await import("fs/promises");
    await fs.mkdir(sessionsDir, { recursive: true });
    await fs.writeFile(path.join(sessionsDir, `${timestamp.replace(/[:.]/g, "-")}.txt`), output, "utf-8");
  } catch { /* ignore */ }

  // Auto-generate workspace index
  try {
    const fs = await import("fs/promises");
    const wsDir = path.join(DATA_DIR, ".agents", slug, "workspace");
    const stats = await fs.stat(wsDir).catch(() => null);
    if (stats?.isDirectory()) {
      const entries = await fs.readdir(wsDir, { withFileTypes: true });
      const files = entries.filter((e) => !e.name.startsWith(".") && e.name !== "index.md");
      if (files.length > 0) {
        const indexPath = path.join(wsDir, "index.md");
        const exists = await fs.stat(indexPath).catch(() => null);
        if (!exists) {
          const fileList = files.map((f) => f.isDirectory() ? `- [${f.name}/](./${f.name}/)` : `- [${f.name}](./${f.name})`).join("\n");
          await fs.writeFile(indexPath, `---\ntitle: "${persona.name} — Workspace"\nmodified: "${timestamp}"\n---\n\n# ${persona.name} Workspace\n\n## Files\n${fileList}\n`, "utf-8");
        }
      }
    }
  } catch { /* ignore */ }

  markHeartbeatComplete(slug);

  // Auto-pause after 3 consecutive failures
  if (status === "failed") {
    const recentHistory = await getHeartbeatHistory(slug);
    const lastThree = recentHistory.slice(0, 3);
    if (lastThree.length >= 3 && lastThree.every((h) => h.status === "failed")) {
      const { writePersona, unregisterHeartbeat } = await import("./persona-manager");
      await writePersona(slug, { active: false });
      unregisterHeartbeat(slug);
      await postMessage({
        channel: "alerts", agent: slug, emoji: persona.emoji, displayName: persona.name,
        type: "alert",
        content: `Auto-paused after 3 consecutive failures. Last error: ${output.slice(0, 150)}. @human`,
        mentions: ["human"], kbRefs: [],
      });
    }
  }

  import("./trigger-engine").then((m) => m.checkGoalBehindTriggers()).catch(() => {});
  autoCommit(`.agents/${slug}`, "Update");
}

/**
 * Execute a scheduled/background heartbeat via child_process.spawn.
 * Used by cron scheduler. No live terminal.
 */
export async function runHeartbeat(slug: string): Promise<void> {
  const ctx = await buildHeartbeatContext(slug);
  if (!ctx) return;
  const { prompt, persona, inbox, cwd, startTime } = ctx;

  markHeartbeatRunning(slug);

  if (persona.heartbeatsUsed !== undefined && persona.heartbeatsUsed >= persona.budget) {
    console.log(`Agent ${slug} has exceeded budget (${persona.heartbeatsUsed}/${persona.budget}). Skipping.`);
    return;
  }

  let output = "";
  let status: "completed" | "failed" = "completed";
  const MAX_RETRIES = 2;

  const executeOnce = (timeoutMs: number): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "claude",
        ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
        { cwd, env: { ...process.env }, stdio: ["pipe", "pipe", "pipe"] }
      );
      let stdout = "", stderr = "";
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
      proc.on("close", (code) => { code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr || `Exit code ${code}`)); });
      proc.on("error", (err) => reject(err));
      setTimeout(() => { proc.kill(); reject(new Error("Heartbeat timed out")); }, timeoutMs);
    });

  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      output = await executeOnce(attempt === 0 ? 300_000 : 180_000);
      status = "completed";
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      if (attempt < MAX_RETRIES) {
        console.log(`Agent ${slug} heartbeat attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${lastError}. Retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        status = "failed";
        output = lastError;
        await postMessage({
          channel: "alerts", agent: slug, emoji: persona.emoji, displayName: persona.name,
          type: "alert",
          content: `Heartbeat failed after ${MAX_RETRIES + 1} attempts: ${lastError.slice(0, 200)}. @human`,
          mentions: ["human"], kbRefs: [],
        });
      }
    }
  }

  await processHeartbeatOutput(slug, output, status, persona, inbox, startTime);
}

/**
 * Start a manual heartbeat via daemon PTY so the user sees live output.
 * Creates a PTY session in the daemon and returns the sessionId immediately.
 * Post-processing (memory updates, goal tracking etc.) runs in the background.
 *
 * Returns the sessionId for the frontend to connect a WebTerminal to.
 * Returns null if the agent is inactive or over budget.
 */
export async function startManualHeartbeat(slug: string): Promise<string | null> {
  const ctx = await buildHeartbeatContext(slug);
  if (!ctx) return null;
  const { prompt, persona, inbox, startTime } = ctx;

  if (persona.heartbeatsUsed !== undefined && persona.heartbeatsUsed >= persona.budget) {
    console.log(`Agent ${slug} has exceeded budget. Skipping.`);
    return null;
  }

  markHeartbeatRunning(slug);

  const sessionId = `agent-${slug}-${Date.now()}`;

  // Create PTY session in daemon (starts immediately)
  try {
    await fetch("http://localhost:3001/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId,
        args: ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
      }),
    });
  } catch (err) {
    console.error(`Failed to create daemon session for ${slug}:`, err);
    markHeartbeatComplete(slug);
    return null;
  }

  // Poll for completion and run post-processing in the background
  (async () => {
    let output = "";
    let status: "completed" | "failed" = "failed";
    const deadline = Date.now() + 10 * 60 * 1000; // 10 min max

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`http://localhost:3001/session/${sessionId}/output`);
        if (res.ok) {
          const data = await res.json() as { status: string; output: string };
          if (data.status === "completed") {
            output = data.output;
            status = "completed";
            break;
          }
          // still running — keep polling
        } else if (res.status === 404) {
          // Session cleaned up — try completedOutput via output endpoint was 404
          // This means it was never found; bail out
          output = "Session not found after polling";
          break;
        }
      } catch { /* retry */ }
    }

    await processHeartbeatOutput(slug, output, status, persona, inbox, startTime);
  })().catch((err) => console.error(`Post-processing failed for ${slug}:`, err));

  return sessionId;
}

/**
 * Run a quick response to a human message in Agent Slack.
 * Lightweight variant of runHeartbeat — focused on responding to the human,
 * not executing full plays or heartbeat duties.
 *
 * Returns the agent's response text (also posted to Slack).
 */
export async function runQuickResponse(
  slug: string,
  humanMessage: string,
  channel: string,
): Promise<string> {
  const persona = await readPersona(slug);
  if (!persona) return "";

  // Load memory for context
  const context = await readMemory(slug, "context.md");
  const learnings = await readMemory(slug, "learnings.md");

  // Load goal state for context
  let goalsContext = "";
  if (persona.goals && persona.goals.length > 0) {
    const goalState = await getGoalState(slug);
    goalsContext = persona.goals
      .map((g) => {
        const state = goalState[g.metric];
        const current = state?.current ?? g.current ?? 0;
        const pct = g.target > 0 ? Math.round((current / g.target) * 100) : 0;
        return `- **${g.metric}**: ${current}/${g.target} ${g.unit} (${pct}%)`;
      })
      .join("\n");
  }

  // Load recent Slack messages from this channel for conversation context
  let recentMessages = "";
  try {
    const { getMessages } = await import("./slack-manager");
    const msgs = await getMessages(channel, 10);
    if (msgs.length > 0) {
      recentMessages = msgs
        .map(
          (m) =>
            `${m.displayName || m.agent} (${new Date(m.timestamp).toLocaleTimeString()}): ${m.content.slice(0, 200)}`,
        )
        .join("\n");
    }
  } catch {
    /* ignore */
  }

  const prompt = `${persona.body}

---

## Context

You are responding to a human message in Agent Slack channel #${channel}.
Keep your response concise, helpful, and on-topic. Do NOT include any \`\`\`memory blocks — this is a direct conversation, not a heartbeat.

### Your Memory (recent context)
${context ? context.slice(-1500) : "(no previous context)"}

### Your Learnings
${learnings ? learnings.slice(-800) : "(none yet)"}

### Goal Progress
${goalsContext || "(no goals configured)"}

### Recent conversation in #${channel}
${recentMessages || "(no recent messages)"}

---

## Human message (respond to this):
${humanMessage}

---

Respond naturally as ${persona.name}. Be concise (1-3 short paragraphs max). Reference specific data, KB pages, or workspace files when relevant. If asked about status or progress, reference your actual goal numbers.`;

  let response = "";
  try {
    const cwd =
      persona.workdir === "/data"
        ? DATA_DIR
        : path.join(DATA_DIR, persona.workdir);

    response = await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "claude",
        [
          "--dangerously-skip-permissions",
          "-p",
          prompt,
          "--output-format",
          "text",
        ],
        { cwd, env: { ...process.env }, stdio: ["pipe", "pipe", "pipe"] },
      );

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (d: Buffer) => {
        stdout += d.toString();
      });
      proc.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr || `Exit code ${code}`));
      });

      proc.on("error", (err) => reject(err));

      // 2 minute timeout for quick responses
      setTimeout(() => {
        proc.kill();
        reject(new Error("Response timed out"));
      }, 120_000);
    });
  } catch (err) {
    response =
      err instanceof Error
        ? `Sorry, I encountered an error: ${err.message}`
        : "Sorry, I encountered an error processing your request.";
  }

  // Post the response to Slack
  if (response) {
    await postMessage({
      channel,
      agent: slug,
      emoji: persona.emoji,
      displayName: persona.name,
      type: "message",
      content: response,
      mentions: [],
      kbRefs: [],
    });
  }

  return response;
}
