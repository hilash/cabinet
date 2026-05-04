"use client";

import { useState } from "react";
import Link from "next/link";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OPTALE_PRODUCT } from "@/lib/optale/product";

export default function OnboardingPreviewPage() {
  const [complete, setComplete] = useState(false);

  if (!complete) {
    return (
      <OnboardingWizard
        preview
        onComplete={() => setComplete(true)}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Preview complete
        </p>
        <h1 className="text-2xl font-semibold tracking-normal">
          Onboarding preview finished
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          This preview does not write onboarding setup data. Return to {OPTALE_PRODUCT.name}
          or refresh to replay the wizard.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Open Command
        </Link>
      </div>
    </main>
  );
}
