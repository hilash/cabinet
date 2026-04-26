// Next.js boot hook: runs once on server start. Used here to bootstrap
// agents that ship as shared, cabinet-spanning globals so they exist on
// disk before any persona lookup hits.
//
// Documented at https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureGlobalAgents } = await import("./lib/agents/library-manager");
    await ensureGlobalAgents();
  } catch (err) {
    console.error("instrumentation: ensureGlobalAgents failed", err);
  }
}
