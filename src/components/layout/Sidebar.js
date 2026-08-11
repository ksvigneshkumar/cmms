'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  Activity,
  AlertTriangle,
  ClipboardList,
  Users,
  History,
  FileText,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', href: '/assets', icon: Activity },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
  { name: 'Technicians', href: '/technicians', icon: Users },
  { name: 'History', href: '/history', icon: History },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Housekeeping', href: '/housekeeping', icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 border-r border-border bg-card">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Settings className="w-6 h-6 text-primary mr-2" />
        <span className="text-lg font-bold text-foreground tracking-tight">CMMS Pro</span>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className={cn('mr-3 h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          IoT Engine: Active
        </div>
      </div>
    </div>
  );
}
