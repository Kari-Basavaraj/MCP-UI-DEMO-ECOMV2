import figma from "@figma/code-connect"

// Tab — Design System Component
// Figma node: 3729:12963
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=3729-12963", {
  example: () => (
    <div className="tab-list" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
  ),
})
