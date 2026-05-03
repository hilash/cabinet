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
  const initialSurface: PrototypeSurface =
    params.surface === "brain" || params.surface === "agents"
      ? params.surface
      : "workbench";

  return <OptaleCommandPrototype initialSurface={initialSurface} />;
}
