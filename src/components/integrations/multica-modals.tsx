"use client";

import dynamic from "next/dynamic";

const ModalRegistry = dynamic(
  () =>
    import("@multica/views/modals/registry").then((m) => m.ModalRegistry),
  { ssr: false }
);

const SearchCommand = dynamic(
  () =>
    import("@multica/views/search").then(
      (m) => m.SearchCommand
    ),
  { ssr: false }
);

/**
 * Renders global Multica modals (create issue, create workspace) and
 * the Cmd+K search command palette.
 *
 * Drop this component at the root of the app shell so the modals are
 * available regardless of which section is active.
 */
export function MulticaModals() {
  return (
    <>
      <ModalRegistry />
      <SearchCommand />
    </>
  );
}
