import type { Metadata } from "next";
import Link from "next/link";

import { OPTALE_PRODUCT } from "@/lib/optale/product";

export const metadata: Metadata = {
  title: `Privacy Notice — ${OPTALE_PRODUCT.name}`,
};

export default function PrivacyNoticePage() {
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
            Privacy and data handling
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Command is designed around visible source evidence, scoped memory
            lanes, and governed tool access. Partner/customer profiles should not
            expose operator-only diagnostics, provider secrets, terminal runtime
            controls, or Optale-private Company Brain data.
          </p>
        </div>
        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold">Deployment-specific controls</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Local development builds may use local files, local agents, and CLI
            providers configured on the machine. Hosted business deployments
            should use approved API-backed runtimes, customer-scoped storage, and
            explicit retention/security settings.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Formal privacy commitments, subprocessors, retention periods, and
            data-processing terms should be supplied through the applicable Optale
            customer or partner agreement.
          </p>
        </section>
      </div>
    </main>
  );
}
