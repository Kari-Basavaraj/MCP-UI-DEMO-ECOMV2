"use client";

import type { ModelInfo } from "@/ai/providers";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useCallback } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { toast } from "sonner";
import { getUserId } from "@/lib/user-id";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useMCP } from "@/lib/context/mcp-context";

const FALLBACK_MODELS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
];

const FALLBACK_MODEL_DETAILS: Record<string, ModelInfo> = {
  "openai/gpt-4o-mini": { provider: "OpenAI", name: "GPT-4o Mini", description: "Fast & affordable" },
  "anthropic/claude-3.5-sonnet": { provider: "Anthropic", name: "Claude 3.5 Sonnet", description: "Balanced performance" },
  "google/gemini-2.0-flash-001": { provider: "Google", name: "Gemini 2.0 Flash", description: "Google fast model" },
};

export default function Chat() {
  const [selectedModel, setSelectedModel] = useLocalStorage<string>("selectedModel", "");
  const [userId, setUserId] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [modelDetails, setModelDetails] = useState<Record<string, ModelInfo>>({});
  const { mcpServersForApi } = useMCP();

  // Fetch available models from the API
  useEffect(() => {
    let cancelled = false;

    const applyModelPayload = (data: any) => {
      const modelsFromApi = Array.isArray(data?.models) ? data.models : [];
      const detailsFromApi = data?.details && typeof data.details === "object" ? data.details : {};
      const defaultFromApi = typeof data?.defaultModel === "string" ? data.defaultModel : "";

      if (modelsFromApi.length > 0) {
        setModels(modelsFromApi);
        setModelDetails(detailsFromApi);
        if (!selectedModel && defaultFromApi) {
          setSelectedModel(defaultFromApi);
        }
        return true;
      }
      return false;
    };

    const loadModels = async () => {
      const maxAttempts = 2;
      let lastError = "";

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await fetch("/api/models", { cache: "no-store" });
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data?.error || `Model API failed (${response.status})`);
          }

          if (cancelled) return;
          if (applyModelPayload(data)) return;

          const explicitError = typeof data?.error === "string" ? data.error : "No models returned";
          throw new Error(explicitError);
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Failed to load models";
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      }

      if (cancelled) return;
      // Last-resort client fallback so model picker never collapses to 0 models.
      setModels(FALLBACK_MODELS);
      setModelDetails(FALLBACK_MODEL_DETAILS);
      if (!selectedModel) {
        setSelectedModel(FALLBACK_MODELS[0]);
      }
      toast.error(`Model list degraded to fallback (${lastError})`, {
        position: "top-center",
        richColors: true,
      });
    };

    loadModels();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  const { messages, input, handleInputChange, handleSubmit, status, stop, append } = useChat({
    maxSteps: 20,
    body: {
      selectedModel,
      mcpServers: mcpServersForApi,
      userId,
    },
    experimental_throttle: 100,
    onError: (error) => {
      toast.error(
        error.message.length > 0 ? error.message : "An error occurred, please try again later.",
        { position: "top-center", richColors: true }
      );
    },
  });

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSubmit(e);
    },
    [handleSubmit]
  );

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="h-dvh flex flex-col justify-center w-full max-w-3xl mx-auto px-4 sm:px-6 md:py-4">
      {messages.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <ProjectOverview append={append} />
          <form onSubmit={handleFormSubmit} className="mt-4 w-full mx-auto">
            <Textarea
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleInputChange={handleInputChange}
              input={input}
              isLoading={isLoading}
              status={status}
              stop={stop}
              models={models}
              modelDetails={modelDetails}
            />
          </form>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 pb-2">
            <Messages messages={messages} isLoading={isLoading} status={status} append={append} />
          </div>
          <form onSubmit={handleFormSubmit} className="mt-2 w-full mx-auto mb-4 sm:mb-auto">
            <Textarea
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleInputChange={handleInputChange}
              input={input}
              isLoading={isLoading}
              status={status}
              stop={stop}
              models={models}
              modelDetails={modelDetails}
            />
          </form>
        </>
      )}
    </div>
  );
}
