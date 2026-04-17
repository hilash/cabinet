import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { createGetHandler, createHandler } from "@/lib/http/create-handler";

const CONFIG_DIR = path.join(DATA_DIR, ".agents", ".config");
const COMPANY_FILE = path.join(CONFIG_DIR, "company.json");

export const GET = createGetHandler({
  handler: async () => {
    try {
      const raw = await fs.readFile(COMPANY_FILE, "utf-8");
      return JSON.parse(raw);
    } catch {
      return { exists: false };
    }
  },
});

export const POST = createHandler({
  handler: async (_input, req) => {
    const body = await req.json();
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(COMPANY_FILE, JSON.stringify(body, null, 2), "utf-8");
    return { ok: true };
  },
});
