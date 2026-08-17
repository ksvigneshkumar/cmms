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
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileMenu } from '@/components/layout/MobileMenuContext';

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
  const { isOpen, setIsOpen } = useMobileMenu();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-primary mr-2" />
            <span className="text-lg font-bold text-foreground tracking-tight">CMMS Pro</span>
          </div>
          <button 
            className="md:hidden p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
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
    </>
  );
}
