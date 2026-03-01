import figma from "@figma/code-connect"

// Pagination Previous — Design System Component
// Figma node: 9762:880
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-880", {
  example: () => (
    <button
          className="pagination-btn pagination-prev"
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          ← Previous
        </button>
  ),
})
