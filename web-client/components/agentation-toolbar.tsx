"use client";

import { Agentation } from "agentation";

function env(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function AgentationToolbar() {
  const isEnabled =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_AGENTATION_ENABLED !== "false";

  if (!isEnabled) return null;

  const endpoint = env("NEXT_PUBLIC_AGENTATION_ENDPOINT") ?? "http://localhost:4747";
  const webhookUrl = env("NEXT_PUBLIC_AGENTATION_WEBHOOK_URL");

  return <Agentation endpoint={endpoint} webhookUrl={webhookUrl} />;
}
