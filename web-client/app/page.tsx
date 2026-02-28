import Chat from '@/components/chat';
import Sidebar from '@/components/sidebar';

export default function Page() {
  return (
    <div className="flex h-dvh bg-[radial-gradient(circle_at_top,_var(--sds-color-background-brand-tertiary),_var(--sds-color-background-default-default)_45%)]">
      <Sidebar />
      <main className="flex-1 overflow-hidden p-3 sm:p-4">
        <div className="h-full rounded-2xl border border-border/40 bg-background/80 backdrop-blur-sm shadow-[0_12px_40px_-28px_rgba(0,0,0,0.55)]">
          <Chat />
        </div>
      </main>
    </div>
  );
}
