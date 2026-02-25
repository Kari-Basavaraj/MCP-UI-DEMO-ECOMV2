import Chat from '@/components/chat';
import Sidebar from '@/components/sidebar';

export default function Page() {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  );
}
