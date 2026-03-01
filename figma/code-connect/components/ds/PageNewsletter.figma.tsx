import figma from "@figma/code-connect"

// Page Newsletter — Design System Component
// Figma node: 348:15133
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15133", {
  example: () => (
    <section className="page-section page-newsletter">
          <h2>{title}</h2>
          <p>{description}</p>
          <form onSubmit={onSubscribe}>
            <input className="field-input" type="email" placeholder="Email" />
            <button className="btn btn-primary">Subscribe</button>
          </form>
        </section>
  ),
})
