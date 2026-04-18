import path from "path";
import { DATA_DIR } from "@/lib/storage/path-utils";
import {
  ensureDirectory,
  fileExists,
  readFileContent,
  writeFileContent,
} from "@/lib/storage/fs-operations";

const CONFIG_DIR = path.join(DATA_DIR, ".agents", ".config");
const COMPANY_FILE = path.join(CONFIG_DIR, "company.json");

export type CompanyProfile = Record<string, unknown>;

export async function readCompany(): Promise<CompanyProfile | { exists: false }> {
  if (!(await fileExists(COMPANY_FILE))) return { exists: false };
  try {
    return JSON.parse(await readFileContent(COMPANY_FILE));
  } catch {
    return { exists: false };
  }
}

export async function writeCompany(profile: CompanyProfile): Promise<void> {
  await ensureDirectory(CONFIG_DIR);
  await writeFileContent(COMPANY_FILE, JSON.stringify(profile, null, 2));
}
