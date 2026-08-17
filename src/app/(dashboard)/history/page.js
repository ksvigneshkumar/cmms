'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Calendar, Wrench, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('maintenance_history')
      .select(`
        *,
        assets (name, created_at),
        profiles (full_name)
      `)
      .order('completed_at', { ascending: false });
    
    if (data) setHistory(data);
    setLoading(false);
  };

  const filteredHistory = history.filter(record => 
    record.issue.toLowerCase().includes(search.toLowerCase()) || 
    (record.assets?.name && record.assets.name.toLowerCase().includes(search.toLowerCase())) ||
    record.resolution.toLowerCase().includes(search.toLowerCase())
  );

  const getMTBF = (assetCreatedAt, failureTime) => {
    if (!assetCreatedAt || !failureTime) return '0h 0m';
    const diffMs = new Date(failureTime) - new Date(assetCreatedAt);
    const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const diffMins = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
    return `${diffHours}h ${diffMins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Maintenance History</h1>
          <p className="text-muted-foreground">Log of all completed maintenance tasks and repairs.</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
              placeholder="Search by issue, asset, or resolution..."
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-background border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4">Asset & Issue</th>
                <th className="px-6 py-4">Resolution</th>
                <th className="px-6 py-4">Technician</th>
                <th className="px-6 py-4">Cost</th>
                <th className="px-6 py-4">Running Time (MTBF)</th>
                <th className="px-6 py-4">Downtime (MTTR)</th>
                <th className="px-6 py-4">Completed Date</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading history...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                    No maintenance records found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{record.assets?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]" title={record.issue}>{record.issue}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[250px]">
                      <div className="truncate" title={record.resolution}>{record.resolution}</div>
                      {record.parts_used && (
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> Parts: {record.parts_used}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {record.profiles?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">${record.maintenance_cost}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-md inline-block">
                        {getMTBF(record.assets?.created_at, record.completed_at)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Ran before failure</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md inline-block">
                        {Math.floor(record.time_taken / 60)}h {record.time_taken % 60}m
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Machine was down</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(record.completed_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
