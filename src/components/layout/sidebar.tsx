'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  ImageIcon,
  Video,
  Settings,
  BarChart3,
  LogOut,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const mainNav: NavItem[] = [
  { href: '/studio', label: 'Studio', icon: <Sparkles className="h-5 w-5" /> },
  { href: '/images', label: 'Images', icon: <ImageIcon className="h-5 w-5" /> },
  { href: '/videos', label: 'Videos', icon: <Video className="h-5 w-5" /> },
];

const secondaryNav: NavItem[] = [
  { href: '/admin', label: 'Admin', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/studio" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary">DESAYRE</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
          Create
        </p>
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href} />
        ))}

        <p className="mb-2 mt-6 px-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
          System
        </p>
        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-accent/10 text-accent'
          : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}
