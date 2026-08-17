/**
 * @file TopNav.js
 * @description Global top navigation bar with realtime notifications and global search functionality.
 * @author Vignesh K.S
 * @company CMMS Pro
 * @created 2026-08
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, Menu, AlertTriangle, AlertCircle, Info, X, Loader2, Cuboid, ShieldAlert, ClipboardSignature } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useMobileMenu } from '@/components/layout/MobileMenuContext';
import Link from 'next/link';

export default function TopNav() {
  const router = useRouter();
  const { setIsOpen } = useMobileMenu();
  
  // Notification State
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // Initialize notifications and global click listener
  useEffect(() => {
    fetchAlerts();

    // Subscribe to realtime alerts
    const subscription = supabase
      .channel('alerts-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          fetchAlerts();
        }
      )
      .subscribe();

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      supabase.removeChannel(subscription);
    };
  }, []);

  // Global Search Logic (Debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setShowSearchDropdown(true);
    setIsSearching(true);

    const delayDebounceFn = setTimeout(async () => {
      await performGlobalSearch(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performGlobalSearch = async (query) => {
    try {
      // Search across multiple tables concurrently
      const [
        { data: assets },
        { data: alertsData },
        { data: workOrders }
      ] = await Promise.all([
        supabase.from('assets').select('id, name, type').ilike('name', `%${query}%`).limit(3),
        supabase.from('alerts').select('id, issue').ilike('issue', `%${query}%`).limit(3),
        supabase.from('work_orders').select('id, issue').ilike('issue', `%${query}%`).limit(3)
      ]);

      const combinedResults = [
        ...(assets || []).map(a => ({ id: a.id, title: a.name, subtitle: `Asset • ${a.type}`, type: 'asset', icon: <Cuboid className="w-4 h-4 text-primary" />, link: '/assets' })),
        ...(alertsData || []).map(a => ({ id: a.id, title: a.issue, subtitle: 'Alert', type: 'alert', icon: <ShieldAlert className="w-4 h-4 text-destructive" />, link: '/alerts' })),
        ...(workOrders || []).map(w => ({ id: w.id, title: w.issue, subtitle: 'Work Order', type: 'work_order', icon: <ClipboardSignature className="w-4 h-4 text-orange-500" />, link: '/work-orders' }))
      ];

      setSearchResults(combinedResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('id, issue, priority, created_at, assets(name)')
      .eq('status', 'Open')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!error && data) {
      setAlerts(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'cmms_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/auth/login');
    router.refresh();
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'Critical': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'High': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card gap-4">
      <div className="flex-1 flex items-center gap-3">
        <button
          className="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Global Search Bar */}
        <div className="relative flex-1 md:w-96 md:flex-none" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
            className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
            placeholder="Search assets, work orders..."
          />
          
          {/* Search Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 mt-2 w-full sm:w-96 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="max-h-96 overflow-y-auto py-2">
                {isSearching && searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No results found for "{searchQuery}"</div>
                ) : (
                  <div className="divide-y divide-border">
                    {searchResults.map((result, idx) => (
                      <Link 
                        key={`${result.type}-${result.id}-${idx}`} 
                        href={result.link}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        className="px-4 py-3 flex gap-3 hover:bg-accent/50 transition-colors block"
                      >
                        <div className="shrink-0 mt-0.5 p-2 bg-background rounded-lg border border-border">
                          {result.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">{result.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{result.subtitle}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
          >
            <Bell className="h-5 w-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No new alerts right now.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {alerts.map((alert) => (
                      <Link 
                        key={alert.id} 
                        href="/alerts"
                        onClick={() => setShowNotifications(false)}
                        className="p-4 flex gap-3 hover:bg-accent/50 transition-colors block"
                      >
                        <div className="shrink-0 mt-0.5">
                          {getPriorityIcon(alert.priority)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">{alert.issue}</p>
                          <p className="text-xs text-muted-foreground mt-1">Asset: {alert.assets?.name || 'Unknown'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {alerts.length > 0 && (
                <div className="p-2 border-t border-border bg-accent/30 text-center">
                  <Link 
                    href="/alerts"
                    onClick={() => setShowNotifications(false)} 
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View all alerts
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium text-foreground leading-tight">Admin User</span>
            <span className="text-xs text-muted-foreground">Administrator</span>
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
