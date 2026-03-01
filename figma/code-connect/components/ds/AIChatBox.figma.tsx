import figma from "@figma/code-connect"

// AI Chat Box — Design System Component
// Figma node: 4309:7636
figma.connect("https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=4309-7636", {
  example: () => (
    <div className="ai-chat-box">
          <div className="ai-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`ai-message ai-message-${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="ai-input">
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={onSend}>Send</button>
          </div>
        </div>
  ),
})
