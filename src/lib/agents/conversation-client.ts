"use client";

import type {
  CreateConversationRequest,
  CreateConversationResponse,
} from "@/types/conversations";
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type Locale } from "@/i18n";

function getErrorMessage(
  fallback: string,
  payload: unknown
): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim()
  ) {
    return payload.error;
  }

  return fallback;
}

function readClientLocale(): Locale | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as Locale;
  }
  return undefined;
}

export async function createConversation(
  request: CreateConversationRequest,
  errorMessage = "Failed to start conversation"
): Promise<CreateConversationResponse> {
  // Inject the user's UI locale so the server can instruct the agent to
  // respond in that language. Caller-provided `locale` wins so any future
  // per-agent override still works.
  const requestWithLocale = {
    locale: readClientLocale(),
    ...request,
  };
  const response = await fetch("/api/agents/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestWithLocale),
  });

  const payload = (await response.json().catch(() => null)) as
    | CreateConversationResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(errorMessage, payload));
  }

  if (!payload || typeof payload !== "object" || !("conversation" in payload)) {
    throw new Error(errorMessage);
  }

  return payload as CreateConversationResponse;
}
