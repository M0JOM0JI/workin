import { Sidebar } from './sidebar';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[rgb(var(--color-bg))]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
