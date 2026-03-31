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
  listMemoryFiles,
  markHeartbeatRunning,
  markHeartbeatComplete,
  getHeartbeatHistory,
} from "./persona-manager";
import { readFileContent, fileExists } from "@/lib/storage/fs-operations";
import { autoCommit } from "@/lib/git/git-service";
import { listPlays, readPlay } from "./play-manager";
import { postMessage } from "./slack-manager";
import { getGoalState, updateGoal } from "./goal-manager";

/**
 * Execute a single heartbeat for an agent persona.
 *
 * Flow:
 * 1. Load persona definition (persona MD file)
 * 2. Load agent memory (context.md, decisions.md, learnings.md)
 * 3. Load inbox messages from other agents
 * 4. Load focus area pages (recent changes)
 * 5. Construct prompt: persona + memory + messages + focus context
 * 6. Run via Claude headless
 * 7. Parse output for memory updates and messages to other agents
 * 8. Save updated memory
 * 9. Clear processed inbox
 * 10. Record heartbeat result
 * 11. Git auto-commit
 */
export async function runHeartbeat(slug: string): Promise<void> {
  const startTime = Date.now();
  const persona = await readPersona(slug);

  if (!persona || !persona.active) return;

  markHeartbeatRunning(slug);

  // Check budget
  if (persona.heartbeatsUsed !== undefined && persona.heartbeatsUsed >= persona.budget) {
    console.log(`Agent ${slug} has exceeded budget (${persona.heartbeatsUsed}/${persona.budget}). Skipping.`);
    return;
  }

  // Load memory
  const context = await readMemory(slug, "context.md");
  const decisions = await readMemory(slug, "decisions.md");
  const learnings = await readMemory(slug, "learnings.md");

  // Load inbox
  const inbox = await readInbox(slug);
  const inboxText = inbox.length > 0
    ? inbox.map((m) => `**From ${m.from}** (${m.timestamp}):\n${m.message}`).join("\n\n---\n\n")
    : "(no new messages)";

  // Load focus area pages (just titles and paths for context)
  let focusContext = "";
  for (const focusPath of persona.focus) {
    const indexPath = path.join(DATA_DIR, focusPath, "index.md");
    if (await fileExists(indexPath)) {
      const content = await readFileContent(indexPath);
      // Include first 500 chars of each focus page
      focusContext += `\n### ${focusPath}\n${content.slice(0, 500)}...\n`;
    }
  }

  // Load assigned plays
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

  // Load goal state
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

  // Load task inbox
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

  // Build prompt
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

  // Execute via Claude headless with self-healing retry (PRD Section 8.1)
  let output = "";
  let status: "completed" | "failed" = "completed";
  const MAX_RETRIES = 2;
  const cwd = persona.workdir === "/data" ? DATA_DIR : path.join(DATA_DIR, persona.workdir);

  const executeOnce = (timeoutMs: number): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "claude",
        ["--dangerously-skip-permissions", "-p", prompt, "--output-format", "text"],
        { cwd, env: { ...process.env }, stdio: ["pipe", "pipe", "pipe"] }
      );

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      proc.on("close", (code) => {
        if (code === 0) resolve(stdout.trim());
        else reject(new Error(stderr || `Exit code ${code}`));
      });

      proc.on("error", (err) => reject(err));

      setTimeout(() => { proc.kill(); reject(new Error("Heartbeat timed out")); }, timeoutMs);
    });
  };

  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // First attempt gets 5 min, retries get 3 min
      const timeout = attempt === 0 ? 300_000 : 180_000;
      output = await executeOnce(timeout);
      status = "completed";
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      if (attempt < MAX_RETRIES) {
        console.log(`Agent ${slug} heartbeat failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError}. Retrying...`);
        // Brief pause before retry
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        status = "failed";
        output = lastError;
        // Post failure to #alerts after all retries exhausted
        await postMessage({
          channel: "alerts",
          agent: slug,
          emoji: persona.emoji,
          displayName: persona.name,
          type: "alert",
          content: `Heartbeat failed after ${MAX_RETRIES + 1} attempts: ${lastError.slice(0, 200)}. @human`,
          mentions: ["human"],
          kbRefs: [],
        });
      }
    }
  }

  // Parse memory block from output
  const memoryMatch = output.match(/```memory\n([\s\S]*?)```/);
  if (memoryMatch) {
    const memoryBlock = memoryMatch[1];

    // Update context (rolling — keep last 20 entries)
    const contextUpdate = memoryBlock.match(/CONTEXT_UPDATE:\s*(.*)/);
    if (contextUpdate) {
      const timestamp = new Date().toISOString();
      const entry = `\n\n## ${timestamp}\n${contextUpdate[1].trim()}`;
      const existingContext = await readMemory(slug, "context.md");
      const entries = existingContext.split(/\n## \d{4}-/).filter(Boolean);
      // Keep last 19 + new one = 20
      const trimmed = entries.slice(-19).map((e, i) => i === 0 ? e : `## ${e.startsWith("20") ? "" : ""}${e}`).join("\n");
      await writeMemory(slug, "context.md", trimmed + entry);
    }

    // Append decision
    const decision = memoryBlock.match(/DECISION:\s*(.*)/);
    if (decision && decision[1].trim()) {
      const timestamp = new Date().toISOString();
      const existingDecisions = await readMemory(slug, "decisions.md");
      await writeMemory(slug, "decisions.md",
        existingDecisions + `\n\n## ${timestamp}\n${decision[1].trim()}`
      );
    }

    // Append learning
    const learning = memoryBlock.match(/LEARNING:\s*(.*)/);
    if (learning && learning[1].trim()) {
      const timestamp = new Date().toISOString();
      const existingLearnings = await readMemory(slug, "learnings.md");
      await writeMemory(slug, "learnings.md",
        existingLearnings + `\n\n## ${timestamp}\n${learning[1].trim()}`
      );
    }

    // Send messages to other agents
    const messageMatches = memoryBlock.matchAll(/MESSAGE_TO\s+\[([^\]]+)\]:\s*(.*)/g);
    for (const match of messageMatches) {
      const { sendMessage } = await import("./persona-manager");
      await sendMessage(slug, match[1], match[2].trim());
    }

    // Post to Agent Slack
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

    // Update goals
    const goalMatches = memoryBlock.matchAll(/GOAL_UPDATE\s+\[([^\]]+)\]:\s*\+?(\d+)/g);
    for (const match of goalMatches) {
      const metric = match[1].trim();
      const increment = parseInt(match[2], 10);
      if (increment > 0) {
        await updateGoal(slug, metric, increment);
      }
    }

    // Create tasks for other agents (structured handoffs)
    const taskMatches = memoryBlock.matchAll(/TASK_CREATE\s+\[([^\]]+)\]\s*\[?(\d)?\]?:\s*([^|]+)(?:\|\s*(.*))?/g);
    for (const match of taskMatches) {
      const { createTask } = await import("./task-inbox");
      const toAgent = match[1].trim();
      const priority = match[2] ? parseInt(match[2], 10) : 3;
      const title = match[3].trim();
      const description = match[4]?.trim() || "";
      await createTask({
        fromAgent: slug,
        fromEmoji: persona.emoji,
        fromName: persona.name,
        toAgent,
        channel: persona.channels?.[0] || "general",
        title,
        description,
        kbRefs: [],
        priority,
      });
      // Announce in Slack
      await postMessage({
        channel: persona.channels?.[0] || "general",
        agent: slug,
        emoji: persona.emoji,
        displayName: persona.name,
        type: "task",
        content: `📋 Task created for **@${toAgent}**: ${title}${description ? ` — ${description}` : ""}`,
        mentions: [toAgent],
        kbRefs: [],
      });
    }

    // Complete tasks
    const taskCompleteMatches = memoryBlock.matchAll(/TASK_COMPLETE\s+\[([^\]]+)\]:\s*(.*)/g);
    for (const match of taskCompleteMatches) {
      const { updateTask } = await import("./task-inbox");
      const taskId = match[1].trim();
      const result = match[2].trim();
      await updateTask(slug, taskId, { status: "completed", result });
    }
  }

  // Check floor alerts — post to #alerts if any goal is below floor
  if (persona.goals && persona.goals.length > 0) {
    const goalState = await getGoalState(slug);
    for (const g of persona.goals) {
      if (g.floor !== undefined && g.floor > 0) {
        const state = goalState[g.metric];
        const current = state?.current ?? g.current ?? 0;
        if (current < g.floor) {
          // Check if we're past 80% of the period
          const periodEnd = state?.period_end;
          if (periodEnd) {
            const endDate = new Date(periodEnd).getTime();
            const periodStart = state?.period_start;
            const startDate = periodStart ? new Date(periodStart).getTime() : endDate - 7 * 86400000;
            const periodDuration = endDate - startDate;
            const elapsed = Date.now() - startDate;
            if (elapsed / periodDuration >= 0.8) {
              await postMessage({
                channel: "alerts",
                agent: slug,
                emoji: persona.emoji,
                displayName: persona.name,
                type: "alert",
                content: `**${g.metric}** at ${current}/${g.target} (floor: ${g.floor}) with ${Math.round(((endDate - Date.now()) / 86400000))}d left. Taking corrective action. @human`,
                mentions: ["human"],
                kbRefs: [],
              });
            }
          }
        }
      }
    }
  }

  // Auto-post heartbeat summary to agent's primary channel
  if (status === "completed" && persona.channels && persona.channels.length > 0) {
    const summaryLine = output.slice(0, 300).split("\n")[0] || "Heartbeat completed";
    await postMessage({
      channel: persona.channels[0],
      agent: slug,
      emoji: persona.emoji,
      displayName: persona.name,
      type: "report",
      content: summaryLine,
      mentions: [],
      kbRefs: [],
    });
  }

  // Clear processed inbox
  if (inbox.length > 0 && status === "completed") {
    await clearInbox(slug);
  }

  // Record heartbeat
  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  await recordHeartbeat({
    agentSlug: slug,
    timestamp,
    duration,
    status,
    summary: output.slice(0, 500),
  });

  // Save full session output for replay
  try {
    const sessionsDir = path.join(DATA_DIR, ".agents", slug, "sessions");
    const fs = await import("fs/promises");
    await fs.mkdir(sessionsDir, { recursive: true });
    const sessionFile = path.join(sessionsDir, `${timestamp.replace(/[:.]/g, "-")}.txt`);
    await fs.writeFile(sessionFile, output, "utf-8");
  } catch { /* ignore session save errors */ }

  // Auto-generate workspace index.md if workspace has files (PRD Section 2.6)
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
          const fileList = files
            .map((f) => f.isDirectory() ? `- [${f.name}/](./${f.name}/)` : `- [${f.name}](./${f.name})`)
            .join("\n");
          const indexContent = `---\ntitle: "${persona.name} — Workspace"\nmodified: "${timestamp}"\n---\n\n# ${persona.name} Workspace\n\n## Files\n${fileList}\n`;
          await fs.writeFile(indexPath, indexContent, "utf-8");
        }
      }
    }
  } catch { /* ignore workspace index errors */ }

  // Mark heartbeat as complete
  markHeartbeatComplete(slug);

  // Auto-pause after 3 consecutive failures (self-healing: PRD Section 8)
  if (status === "failed") {
    const recentHistory = await getHeartbeatHistory(slug);
    const lastThree = recentHistory.slice(0, 3);
    if (lastThree.length >= 3 && lastThree.every((h) => h.status === "failed")) {
      const { writePersona, unregisterHeartbeat } = await import("./persona-manager");
      await writePersona(slug, { active: false });
      unregisterHeartbeat(slug);
      await postMessage({
        channel: "alerts",
        agent: slug,
        emoji: persona.emoji,
        displayName: persona.name,
        type: "alert",
        content: `Auto-paused after 3 consecutive failures. Last error: ${output.slice(0, 150)}. Manual restart required. @human`,
        mentions: ["human"],
        kbRefs: [],
      });
    }
  }

  // Check goal_behind triggers after heartbeat (non-blocking)
  import("./trigger-engine")
    .then((m) => m.checkGoalBehindTriggers())
    .catch(() => {});

  // Git auto-commit
  autoCommit(`.agents/${slug}`, "Update");
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
