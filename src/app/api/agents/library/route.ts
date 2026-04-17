import path from "path";
import fs from "fs/promises";
import matter from "gray-matter";
import { DATA_DIR } from "@/lib/storage/path-utils";
import { createGetHandler } from "@/lib/http/create-handler";

const LIBRARY_DIR = path.join(DATA_DIR, ".agents", ".library");

export const GET = createGetHandler({
  handler: async () => {
    try {
      const entries = await fs.readdir(LIBRARY_DIR, { withFileTypes: true });
      const templates = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const personaPath = path.join(LIBRARY_DIR, entry.name, "persona.md");
        try {
          const raw = await fs.readFile(personaPath, "utf-8");
          const { data, content } = matter(raw);
          templates.push({
            slug: data.slug || entry.name,
            name: data.name || entry.name,
            emoji: data.emoji || "",
            type: data.type || "specialist",
            department: data.department || "general",
            role: data.role || "",
            description: content.trim().split("\n\n")[1] || "",
          });
        } catch {
          // Skip templates without valid persona.md
        }
      }

      return { templates };
    } catch {
      return { templates: [] as unknown[] };
    }
  },
});
