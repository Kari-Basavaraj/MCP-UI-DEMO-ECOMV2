import figma from "@figma/code-connect"

// Hero Newsletter — Design System Component
// Figma node: 348:15919
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15919", {
  example: () => (
    <section className="hero hero-newsletter">
          <h1 className="hero-title">{title}</h1>
          <form className="hero-form" onSubmit={onSubscribe}>
            <input type="email" placeholder="Enter email" className="field-input" />
            <button className="btn btn-primary">Subscribe</button>
          </form>
        </section>
  ),
})
