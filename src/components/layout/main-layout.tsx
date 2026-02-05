'use client';

import { Sidebar } from './sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="mx-auto max-w-7xl p-8">{children}</div>
      </main>
      {/* AI Chat Assistant - Available on all pages */}
      <ChatInterface />
    </div>
  );
}
