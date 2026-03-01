import figma from "@figma/code-connect"

// Pricing Card — Design System Component
// Figma node: 1444:11846
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=1444-11846", {
  example: () => (
    <div className="card pricing-card">
          <div className="pricing-header">
            <h3>{plan.name}</h3>
            <span className="price">₹{plan.price}/mo</span>
          </div>
          <ul className="pricing-features">
            {plan.features.map(f => <li key={f}>{f}</li>)}
          </ul>
          <button className="btn btn-primary">Choose Plan</button>
        </div>
  ),
})
