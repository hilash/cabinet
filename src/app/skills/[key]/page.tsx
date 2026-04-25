import { SkillDetail } from "@/components/skills/skill-detail";

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { key } = await params;
  return (
    <div className="h-full">
      <SkillDetail skillKey={key} />
    </div>
  );
}
