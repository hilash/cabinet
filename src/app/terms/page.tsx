import type { Metadata } from "next";
import Link from "next/link";

import { OPTALE_PRODUCT } from "@/lib/optale/product";

export const metadata: Metadata = {
  title: `Terms Notice — ${OPTALE_PRODUCT.name}`,
};

export default function TermsNoticePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Back to {OPTALE_PRODUCT.name}
        </Link>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Product notice
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Terms for business workspace use
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {OPTALE_PRODUCT.name} is configured for governed business operations:
            scoped memory, source-backed work, review queues, policy-aware actions,
            and restricted partner/runtime profiles where enabled.
          </p>
        </div>
        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold">Use expectations</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Use Command only with data and systems you are authorized to access.
            Local operator builds may call configured local tools and providers.
            Hosted or partner builds should use managed runtime access and scoped
            capabilities appropriate to the customer workspace.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Formal commercial, security, and data-processing terms should be
            supplied through the applicable Optale customer or partner agreement.
          </p>
        </section>
      </div>
    </main>
  );
}
