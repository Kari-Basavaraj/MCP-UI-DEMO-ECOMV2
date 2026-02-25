import type { Metadata } from 'next';
import { MCPProvider } from '@/lib/context/mcp-context';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'MCP-UI Playground',
  description: 'Interactive MCP-UI Ecommerce Playground',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <MCPProvider>
          {children}
          <Toaster position="top-center" richColors theme="dark" />
        </MCPProvider>
      </body>
    </html>
  );
}
