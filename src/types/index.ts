export interface FrontMatter {
  title: string;
  created: string;
  modified: string;
  tags: string[];
  icon?: string;
  order?: number;
  dir?: "ltr" | "rtl";
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory" | "cabinet" | "website" | "app" | "pdf" | "csv" | "code" | "image" | "video" | "audio" | "mermaid" | "unknown";
  hasRepo?: boolean;
  isLinked?: boolean;
  frontmatter?: Partial<FrontMatter>;
  children?: TreeNode[];
}

export interface PageData {
  path: string;
  content: string;
  frontmatter: FrontMatter;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export * from "./update";
