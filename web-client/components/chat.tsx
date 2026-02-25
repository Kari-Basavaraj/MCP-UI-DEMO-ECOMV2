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

export default function Chat() {
  const [selectedModel, setSelectedModel] = useLocalStorage<string>("selectedModel", "");
  const [userId, setUserId] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [modelDetails, setModelDetails] = useState<Record<string, ModelInfo>>({});
  const { mcpServersForApi } = useMCP();

  // Fetch available models from the API
  useEffect(() => {
    fetch("/api/models")
      .then(r => r.json())
      .then(data => {
        setModels(data.models || []);
        setModelDetails(data.details || {});
        // Set default model if none selected yet
        if (!selectedModel && data.defaultModel) {
          setSelectedModel(data.defaultModel);
        }
      })
      .catch(() => {});
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
    experimental_throttle: 500,
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
          <ProjectOverview />
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
