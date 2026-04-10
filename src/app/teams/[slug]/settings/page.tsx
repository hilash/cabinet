import { TeamSettingsClient } from "./settings-client";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TeamSettingsClient slug={slug} />;
}
