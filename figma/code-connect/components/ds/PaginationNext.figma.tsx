import figma from "@figma/code-connect"

// Pagination Next — Design System Component
// Figma node: 9762:870
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=9762-870", {
  example: () => (
    <button
          className="pagination-btn pagination-next"
          disabled={currentPage === totalPages}
          onClick={() => setPage(currentPage + 1)}
        >
          Next →
        </button>
  ),
})
