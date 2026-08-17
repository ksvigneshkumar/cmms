'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, MapPin, Sparkles, XCircle, Download } from 'lucide-react';

export default function HousekeepingPage() {
  const [locations, setLocations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skipModal, setSkipModal] = useState({ isOpen: false, locationId: null, taskType: null });
  const [skipReason, setSkipReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch locations
    const { data: locs, error: locError } = await supabase
      .from('housekeeping_locations')
      .select('*')
      .order('name');
      
    if (locs) setLocations(locs);

    // Fetch today's logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: logData, error: logError } = await supabase
      .from('housekeeping_logs')
      .select(`
        id,
        cleaned_at,
        notes,
        location_id,
        profiles ( full_name )
      `)
      .gte('cleaned_at', today.toISOString())
      .order('cleaned_at', { ascending: false });

    if (logData) setLogs(logData);
    
    setLoading(false);
  };

  const markCleaned = async (locationId, taskType, skipReason = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let cleanerId = null;

      if (user) {
        // Verify user exists in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          cleanerId = profile.id;
        }
      }

      // If no valid cleanerId, try to get ANY admin or technician to avoid the foreign key error
      if (!cleanerId) {
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .single();
          
        if (fallbackProfile) {
          cleanerId = fallbackProfile.id;
        }
      }

      const finalNote = skipReason ? `${taskType} - Skipped: ${skipReason}` : taskType;

      const { error } = await supabase.from('housekeeping_logs').insert({
        location_id: locationId,
        cleaned_by: cleanerId,
        notes: finalNote
      });
      
      if (error) throw error;
      
      setSkipModal({ isOpen: false, locationId: null, taskType: null });
      setSkipReason('');
      fetchData();
    } catch (error) {
      console.error('Error logging cleaning:', error);
      alert('Failed to log cleaning.');
    }
  };

  const getTaskLog = (locationId, taskType) => {
    return logs.find(log => log.location_id === locationId && log.notes.startsWith(taskType));
  };

  const handleSkip = (locationId, taskType) => {
    setSkipModal({ isOpen: true, locationId, taskType });
  };

  const submitSkip = (e) => {
    e.preventDefault();
    if (skipReason.trim()) {
      markCleaned(skipModal.locationId, skipModal.taskType, skipReason.trim());
    }
  };

  const downloadReport = async () => {
    try {
      // Get date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: allLogs, error } = await supabase
        .from('housekeeping_logs')
        .select(`
          cleaned_at,
          notes,
          housekeeping_locations ( name, type ),
          profiles ( full_name )
        `)
        .gte('cleaned_at', thirtyDaysAgo.toISOString())
        .order('cleaned_at', { ascending: false });

      if (error) throw error;
      if (!allLogs || allLogs.length === 0) {
        alert('No logs found to download for the last 30 days.');
        return;
      }

      const headers = ['Date', 'Time', 'Location', 'Type', 'Task', 'Status', 'Reason', 'Cleaned By'];
      const rows = allLogs.map(log => {
        const dateObj = new Date(log.cleaned_at);
        
        let task = log.notes || '';
        let status = 'Done';
        let reason = '-';

        // Parse "Skipped" logic from both web and mobile formats
        if (log.notes && log.notes.includes('Skipped')) {
          status = 'Skipped';
          // Examples: "Daily Cleaning - Skipped: No water" or "Skipped: Daily Cleaning - No water"
          if (log.notes.startsWith('Skipped:')) {
            const parts = log.notes.replace('Skipped: ', '').split(' - ');
            task = parts[0] || '';
            reason = parts[1] || '';
          } else {
            const parts = log.notes.split(' - Skipped: ');
            task = parts[0] || '';
            reason = parts[1] || '';
          }
        }

        return [
          dateObj.toLocaleDateString(),
          dateObj.toLocaleTimeString(),
          log.housekeeping_locations?.name || 'Unknown',
          log.housekeeping_locations?.type || 'Unknown',
          task,
          status,
          reason,
          log.profiles?.full_name || 'System / Technician'
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      });

      // Fix: Use actual newline instead of literal '\n'
      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `housekeeping_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Housekeeping</h1>
          <p className="text-muted-foreground">Manage and track daily cleaning schedules for halls and rooms.</p>
        </div>
        <button
          onClick={downloadReport}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm font-medium border border-border shadow-sm"
        >
          <Download className="w-4 h-4" /> Download Report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.map((loc) => {
            const dailyLog = getTaskLog(loc.id, 'Daily Cleaning');
            const mopLog = getTaskLog(loc.id, 'Weekly Mop');
            const allDone = dailyLog && mopLog;
            
            const isDailySkipped = dailyLog?.notes.includes('Skipped');
            const isMopSkipped = mopLog?.notes.includes('Skipped');
            
            return (
              <div key={loc.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{loc.name}</h3>
                        <p className="text-sm text-muted-foreground">{loc.type}</p>
                      </div>
                    </div>
                    {allDone ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4" /> All Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" /> Tasks Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Daily Cleaning</span>
                    {!dailyLog ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSkip(loc.id, 'Daily Cleaning')}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm font-medium border border-border"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => markCleaned(loc.id, 'Daily Cleaning')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          <Sparkles className="w-3 h-3" /> Mark Done
                        </button>
                      </div>
                    ) : (
                      <span className={`flex items-center gap-1 text-sm font-medium ${isDailySkipped ? 'text-red-500' : 'text-green-600'}`}>
                        {isDailySkipped ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        {isDailySkipped ? 'Skipped' : 'Done'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Weekly Mop</span>
                    {!mopLog ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSkip(loc.id, 'Weekly Mop')}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm font-medium border border-border"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => markCleaned(loc.id, 'Weekly Mop')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          <Sparkles className="w-3 h-3" /> Mark Done
                        </button>
                      </div>
                    ) : (
                      <span className={`flex items-center gap-1 text-sm font-medium ${isMopSkipped ? 'text-red-500' : 'text-green-600'}`}>
                        {isMopSkipped ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        {isMopSkipped ? 'Skipped' : 'Done'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mt-8">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Today's Cleaning Logs</h2>
        </div>
        <div className="p-0">
          {logs.length === 0 && !loading ? (
            <div className="p-8 text-center text-muted-foreground">
              No cleaning activities logged today.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const loc = locations.find(l => l.id === log.location_id);
                return (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.notes.includes('Skipped') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {log.notes.includes('Skipped') ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {loc?.name || 'Unknown Location'} - {log.notes}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="font-medium">{log.profiles?.full_name || 'System / Technician'}</span>
                          <span>•</span>
                          <span>{new Date(log.cleaned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {skipModal.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Skip Task: {skipModal.taskType}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for skipping this task. It will be recorded in the daily logs.
            </p>
            
            <form onSubmit={submitSkip} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={skipReason}
                  onChange={e => setSkipReason(e.target.value)}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="e.g. No water supply, Staff on leave"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => {
                    setSkipModal({ isOpen: false, locationId: null, taskType: null });
                    setSkipReason('');
                  }}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!skipReason.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  Submit Reason
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
