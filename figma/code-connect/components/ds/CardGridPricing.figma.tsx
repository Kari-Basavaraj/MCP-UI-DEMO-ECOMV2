import figma from "@figma/code-connect"

// Card Grid Pricing — Design System Component
// Figma node: 348:14983
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=348-14983", {
  example: () => (
    <section className="card-grid card-grid-pricing">
          <div className="grid grid-cols-3">
            {plans.map(plan => (
              <div key={plan.id} className="card pricing-card">
                <h3>{plan.name}</h3>
                <span className="price">₹{plan.price}/mo</span>
                <button className="btn btn-primary">Choose</button>
              </div>
            ))}
          </div>
        </section>
  ),
})
