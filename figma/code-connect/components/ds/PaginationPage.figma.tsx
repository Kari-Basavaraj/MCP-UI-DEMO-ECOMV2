import figma from "@figma/code-connect"

// Pagination Page — Design System Component
// Figma node: 9762:890
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-890", {
  example: () => (
    <button
          className={`pagination-btn pagination-page ${isCurrent ? "pagination-active" : ""}`}
          aria-current={isCurrent ? "page" : undefined}
          onClick={() => setPage(pageNumber)}
        >
          {pageNumber}
        </button>
  ),
})
