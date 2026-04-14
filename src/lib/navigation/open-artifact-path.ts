import { useAppStore, type SelectedSection } from "@/stores/app-store";
import { useEditorStore } from "@/stores/editor-store";
import { useTreeStore } from "@/stores/tree-store";

const NON_TEXT_ARTIFACT_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".flac",
];

function expandArtifactParents(path: string): void {
  const { expandPath } = useTreeStore.getState();
  const parts = path.split("/").filter(Boolean);
  for (let index = 1; index < parts.length; index += 1) {
    expandPath(parts.slice(0, index).join("/"));
  }
}

function shouldLoadArtifactContent(path: string): boolean {
  const normalized = path.toLowerCase();
  return !NON_TEXT_ARTIFACT_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

export async function openArtifactPath(
  path: string,
  section: SelectedSection
): Promise<void> {
  const { setSection } = useAppStore.getState();
  const { selectPage, loadTree } = useTreeStore.getState();
  const { loadPage } = useEditorStore.getState();

  setSection(section);
  expandArtifactParents(path);
  selectPage(path);

  const work: Promise<unknown>[] = [
    loadTree()
      .then(() => {
        expandArtifactParents(path);
        selectPage(path);
      })
      .catch(() => {}),
  ];

  if (shouldLoadArtifactContent(path)) {
    work.push(loadPage(path).catch(() => {}));
  }

  await Promise.allSettled(work);
}
