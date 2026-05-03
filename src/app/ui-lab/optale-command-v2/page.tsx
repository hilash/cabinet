import type { Metadata } from "next";
import {
  OptaleCommandPrototype,
  type PrototypeSurface,
} from "@/components/optale/optale-command-prototype";

export const metadata: Metadata = {
  title: "Optale Command V2 Prototype",
};

export default async function OptaleCommandV2PrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ surface?: string }>;
}) {
  const params = await searchParams;
  const surface = params.surface === "workbench" ? "chat" : params.surface;
  const initialSurface: PrototypeSurface =
    surface === "chat" ||
    surface === "data" ||
    surface === "brain" ||
    surface === "agents" ||
    surface === "tasks"
      ? surface
      : "chat";

  return <OptaleCommandPrototype initialSurface={initialSurface} />;
}
