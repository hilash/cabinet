"use client";

import { useEffect, useRef, useState } from "react";
import type { ProviderModelOptionsResponse } from "@/types/agents";

export function useProviderModelOptions(providerId?: string, enabled = true) {
  const [data, setData] = useState<ProviderModelOptionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKeyRef = useRef(0);

  useEffect(() => {
    if (!enabled || !providerId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const requestKey = ++requestKeyRef.current;
    setData(null);
    setLoading(true);
    setError(null);

    fetch(`/api/agents/providers/${encodeURIComponent(providerId)}/models`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (controller.signal.aborted || requestKey !== requestKeyRef.current) {
          return;
        }
        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "Unable to load provider model options."
          );
        }
        setData(payload as ProviderModelOptionsResponse);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted || requestKey !== requestKeyRef.current) return;
        setData(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load provider model options."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [enabled, providerId]);

  return { data, loading, error };
}
