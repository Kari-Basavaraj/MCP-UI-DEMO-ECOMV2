import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mt-3 mb-1.5">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-2">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-sm space-y-1 mb-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-sm space-y-1 mb-2">{children}</ol>
        ),
        li: ({ children }) => <li className="text-sm">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <pre className="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs">
              <code className={className}>{children}</code>
            </pre>
          ) : (
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">
              {children}
            </code>
          );
        },
        a: ({ children, href }) => (
          <a
            href={href || "#"}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground text-sm my-2">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse border border-border/40">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border/40 px-2 py-1 bg-muted/30 font-medium text-left">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border/40 px-2 py-1">{children}</td>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
