"use client";

import type { Message as TMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import { ToolInvocation } from "./tool-invocation";
import { Loader2 } from "lucide-react";

const PureMessage = ({
  message,
  isLatestMessage,
  status,
  append,
}: {
  message: TMessage;
  isLoading: boolean;
  isLatestMessage: boolean;
  status: string;
  append: UseChatHelpers["append"];
}) => {
  // Show thinking indicator for assistant when we're waiting for the first token
  const showThinking =
    message.role === "assistant" &&
    isLatestMessage &&
    status === "submitted" &&
    (!message.parts || message.parts.length === 0 || message.parts.every((p) => p.type === "text" && !p.text));

  return (
    <div
      className={cn(
        "w-full mx-auto px-4 group/message",
        message.role === "assistant" ? "mb-8" : "mb-6"
      )}
      data-role={message.role}
    >
      <div
        className={cn(
          "flex gap-4 w-full",
          message.role === "user" ? "ml-auto max-w-2xl w-fit" : ""
        )}
      >
        <div className="flex flex-col w-full space-y-3">
          {showThinking && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="animate-spin h-4 w-4 text-primary/60" />
              <span className="text-sm text-muted-foreground/70 animate-pulse">Thinking...</span>
            </div>
          )}
          {message.parts?.map((part, i) => {
            switch (part.type) {
              case "text":
                return part.text ? (
                  <div key={`part-${i}`} className="flex flex-row gap-2 items-start w-full">
                    <div
                      className={cn("flex flex-col gap-3 w-full", {
                        "bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl":
                          message.role === "user",
                      })}
                    >
                      <Markdown>{part.text}</Markdown>
                    </div>
                  </div>
                ) : null;
              case "tool-invocation":
                return (
                  <ToolInvocation
                    key={`part-${i}`}
                    toolName={part.toolInvocation.toolName}
                    state={part.toolInvocation.state}
                    args={part.toolInvocation.args}
                    result={
                      "result" in part.toolInvocation
                        ? part.toolInvocation.result
                        : null
                    }
                    isLatestMessage={isLatestMessage}
                    status={status}
                    append={append}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
};

export const Message = memo(PureMessage, (prev, next) => {
  if (prev.status !== next.status) return false;
  if (prev.isLoading !== next.isLoading) return false;
  if (prev.isLatestMessage !== next.isLatestMessage) return false;
  if (!equal(prev.message.parts, next.message.parts)) return false;
  return true;
});
