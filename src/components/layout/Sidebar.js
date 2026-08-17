/**
 * @file Sidebar.js
 * @description Application side navigation with responsive drawer for mobile devices.
 * @author Vignesh K.S
 * @company CMMS Pro
 * @created 2026-08
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutTemplate,
  Settings,
  Boxes,
  ShieldAlert,
  Wrench,
  Users,
  History,
  BarChart3,
  Sparkles,
  X,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileMenu } from '@/components/layout/MobileMenuContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutTemplate },
  { name: 'Scan Asset', href: '/scan', icon: QrCode },
  { name: 'Assets', href: '/assets', icon: Boxes },
  { name: 'Alerts', href: '/alerts', icon: ShieldAlert },
  { name: 'Work Orders', href: '/work-orders', icon: Wrench },
  { name: 'Technicians', href: '/technicians', icon: Users },
  { name: 'History', href: '/history', icon: History },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Housekeeping', href: '/housekeeping', icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useMobileMenu();

  return (
    <>
      {/* 
        FIXME (vignesh): On older Android tablets, this overlay fade-in animation stutters slightly. 
        Need to check if hardware acceleration is kicking in or if Tailwind animate-in needs tweaking. 
      */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative",
                    isActive 
                      ? "bg-primary text-white font-medium shadow-md hover:opacity-90" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground font-medium"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-white drop-shadow-sm" : "text-muted-foreground group-hover:text-accent-foreground")} />
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
