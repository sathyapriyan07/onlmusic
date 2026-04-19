import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-premium">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <TopBar />

        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-subtle px-4 py-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600">
              <span className="text-white">🎵</span>
            </div>
            <div className="text-lg font-bold text-primary">ONL Music</div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-24 lg:px-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}