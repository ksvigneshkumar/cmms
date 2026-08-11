'use client';

import { Bell, Search, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function TopNav() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card">
      <div className="flex-1 flex items-center">
        <div className="relative w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
            placeholder="Search assets, work orders..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-sm font-medium text-foreground leading-none">Admin User</span>
            <span className="text-xs text-muted-foreground mt-1">Administrator</span>
          </div>
          <button
            onClick={handleLogout}
            className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            title="Log out"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
