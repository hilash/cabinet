import Image from "next/image";
import { Bot, Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_IMAGE_BY_ICON: Record<string, string> = {
  sparkles:
    "https://upload.wikimedia.org/wikipedia/commons/b/b0/Claude_AI_symbol.svg",
  bot:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/960px-OpenAI_logo_2025_%28symbol%29.svg.png?_=20250205041901",
  gemini: "/providers/gemini.svg",
  minimax: "/providers/minimax.svg",
};

export function ProviderGlyph({
  icon,
  className,
}: {
  icon?: string;
  className?: string;
}) {
  const imageSrc = icon ? PROVIDER_IMAGE_BY_ICON[icon] : undefined;
  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={32}
        height={32}
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }

  if (icon === "terminal") {
    return <Terminal className={className} />;
  }

  if (icon === "sparkles") {
    return <Sparkles className={className} />;
  }

  return <Bot className={className} />;
}
