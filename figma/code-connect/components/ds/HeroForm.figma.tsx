import figma from "@figma/code-connect"

// Hero Form — Design System Component
// Figma node: 348:15933
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-15933", {
  example: () => (
    <section className="hero hero-form">
          <div className="hero-content">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <form className="hero-form-panel">
            <div className="field">
              <input className="field-input" placeholder="Name" />
            </div>
            <div className="field">
              <input className="field-input" placeholder="Email" />
            </div>
            <button className="btn btn-primary btn-lg">Get Started</button>
          </form>
        </section>
  ),
})
