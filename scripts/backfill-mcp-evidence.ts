import { backfillConversationMcpEvidence } from "@/lib/agents/conversation-store";

function readArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const limitArg = readArg("limit");
  const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
  const report = await backfillConversationMcpEvidence({
    cabinetPath: readArg("cabinet-path"),
    limit: Number.isFinite(limit) ? limit : undefined,
    dryRun: process.argv.includes("--dry-run"),
  });

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
