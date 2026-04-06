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
  type: "file" | "directory" | "website" | "app" | "pdf" | "csv";
  hasRepo?: boolean;
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
