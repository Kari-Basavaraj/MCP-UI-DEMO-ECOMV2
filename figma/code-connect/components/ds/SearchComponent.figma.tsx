import figma from "@figma/code-connect"

// Search — Design System Component
// Figma node: 2236:14989
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=2236-14989", {
  example: () => (
    <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary search-btn" data-action="search">
            Search
          </button>
        </div>
  ),
})
