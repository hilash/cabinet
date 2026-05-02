#!/usr/bin/env tsx

import path from "path";
import { OPTALE_META_AGENT_MANIFEST } from "../src/lib/optale/agent-harness/optale-meta-manifest";
import {
  projectAgentManifestPersonas,
  type AgentPersonaProjectionResult,
} from "../src/lib/optale/agent-harness/persona-projection";

interface CliOptions {
  write: boolean;
  overwrite: boolean;
  json: boolean;
  help: boolean;
  targetAgentsDir?: string;
  agentIds: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    write: false,
    overwrite: false,
    json: false,
    help: false,
    agentIds: [],
  };

  for (const arg of argv) {
    if (arg === "--write") {
      options.write = true;
    } else if (arg === "--overwrite") {
      options.overwrite = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg.startsWith("--target-agents-dir=")) {
      options.targetAgentsDir = path.resolve(arg.slice("--target-agents-dir=".length));
    } else if (arg.startsWith("--agent=")) {
      options.agentIds.push(arg.slice("--agent=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function usage(): string {
  return [
    "Usage: npx tsx scripts/optale-agent-harness-personas.ts [options]",
    "",
    "Options:",
    "  --json                         Print the projection plan as JSON.",
    "  --write                        Write missing persona.md files. Defaults to dry-run.",
    "  --overwrite                    Replace existing persona.md files. Requires --write to mutate.",
    "  --target-agents-dir=<path>      Target agents directory. Defaults to CABINET_DATA_DIR/.agents or data/.agents.",
    "  --agent=<definition-id>         Project one definition id. Can be repeated.",
    "  --help                         Show this help.",
  ].join("\n");
}

function printTextResult(result: AgentPersonaProjectionResult): void {
  console.log(
    `Optale Agent Harness persona projection (${result.dryRun ? "dry-run" : "write"})`
  );
  console.log(`target: ${result.targetAgentsDir}`);
  console.log(`overwrite: ${result.overwrite ? "yes" : "no"}`);
  console.log("");
  for (const entry of result.entries) {
    console.log(
      `${entry.action.padEnd(9)} ${entry.slug.padEnd(30)} ${entry.targetPath}`
    );
    console.log(`          ${entry.reason}`);
  }
  console.log("");
  console.log(`written: ${result.writtenCount}`);
  console.log(`skipped: ${result.skippedCount}`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const result = await projectAgentManifestPersonas(OPTALE_META_AGENT_MANIFEST, {
    dryRun: !options.write,
    overwrite: options.overwrite,
    targetAgentsDir: options.targetAgentsDir,
    agentIds: options.agentIds.length > 0 ? options.agentIds : undefined,
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          dryRun: result.dryRun,
          overwrite: result.overwrite,
          targetAgentsDir: result.targetAgentsDir,
          writtenCount: result.writtenCount,
          skippedCount: result.skippedCount,
          entries: result.entries.map((entry) => ({
            definitionId: entry.definitionId,
            slug: entry.slug,
            targetPath: entry.targetPath,
            exists: entry.exists,
            action: entry.action,
            reason: entry.reason,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  printTextResult(result);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
