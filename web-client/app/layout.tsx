import type { Metadata } from 'next';
import { MCPProvider } from '@/lib/context/mcp-context';
import { ThemeProvider } from '@/lib/context/theme-context';
import { AgentationToolbar } from '@/components/agentation-toolbar';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'MCP-UI Playground',
  description: 'Interactive MCP-UI Ecommerce Playground',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <MCPProvider>
            {children}
            <Toaster position="top-center" richColors />
            <AgentationToolbar />
          </MCPProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
