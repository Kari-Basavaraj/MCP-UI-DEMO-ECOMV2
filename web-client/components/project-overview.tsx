export function ProjectOverview() {
  return (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-primary text-lg font-bold">M</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">MCP-UI Playground</h1>
      </div>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        Chat with an AI assistant that can browse products, search, filter, and manage your 
        shopping cart using interactive MCP-UI widgets.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
        <span>Configure MCP servers in the sidebar</span>
        <span>·</span>
        <span>Select an AI model below</span>
      </div>
    </div>
  );
}
