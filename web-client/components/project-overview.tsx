"use client";

import { ShoppingBag, Search, Star, Heart, Grid3X3, Tag } from "lucide-react";
import type { UseChatHelpers } from "@ai-sdk/react";
import { nanoid } from "nanoid";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Grid3X3 className="h-4 w-4" />,
    label: "Browse All Products",
    prompt: "Show me all available products",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
  },
  {
    icon: <Search className="h-4 w-4" />,
    label: "Find Running Shoes",
    prompt: "I'm looking for running shoes",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  },
  {
    icon: <Tag className="h-4 w-4" />,
    label: "Today's Best Deals",
    prompt: "What are the best deals right now? Show me prices",
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
  },
  {
    icon: <Star className="h-4 w-4" />,
    label: "Top Rated Products",
    prompt: "Show me reviews for the Nike Air Max 90",
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
  },
  {
    icon: <ShoppingBag className="h-4 w-4" />,
    label: "View My Cart",
    prompt: "Show me my shopping cart",
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
  },
  {
    icon: <Heart className="h-4 w-4" />,
    label: "My Wishlist",
    prompt: "Show me my wishlist",
    color: "bg-pink-500/10 text-pink-600 border-pink-200",
  },
];

export function ProjectOverview({ append }: { append?: UseChatHelpers["append"] }) {
  const handleAction = (prompt: string) => {
    if (append) {
      append({ id: nanoid(), role: "user", content: prompt });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
            <span className="text-primary text-xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">MCP-UI Playground</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Shop with an AI assistant — browse products, compare prices, read reviews, 
          and manage your cart with interactive widgets.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => handleAction(action.prompt)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-medium
              transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
              ${action.color}`}
          >
            {action.icon}
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/50">
        <span>Configure MCP servers in the sidebar</span>
        <span>·</span>
        <span>Select an AI model below</span>
      </div>
    </div>
  );
}
