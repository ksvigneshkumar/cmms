'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Search, Filter, ShieldAlert, ShieldCheck, UserPlus, X } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Assignment State
  const [assigningAlert, setAssigningAlert] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchAlerts(true);
    
    const subscription = supabase
      .channel('alerts-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchAlerts = async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          assets (name, type, location)
        `)
        .neq('status', 'Resolved')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (data) setAlerts(data);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setAlerts([]);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(alert => 
    alert.issue.toLowerCase().includes(search.toLowerCase()) || 
    (alert.assets?.name && alert.assets.name.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedAlerts = Object.values(filteredAlerts.reduce((acc, alert) => {
    const key = alert.asset_id || alert.id;
    if (!acc[key]) {
      acc[key] = {
        id: alert.id,
        alert_ids: [alert.id],
        asset_id: alert.asset_id,
        assets: alert.assets,
        issues: [alert.issue],
        priority: alert.priority,
        status: alert.status,
        created_at: alert.created_at
      };
    } else {
      acc[key].alert_ids.push(alert.id);
      acc[key].issues.push(alert.issue);
      
      const priorities = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      if (priorities[alert.priority] > (priorities[acc[key].priority] || 0)) {
        acc[key].priority = alert.priority;
      }
      
      if (alert.status === 'Open') acc[key].status = 'Open';
      else if (alert.status === 'Acknowledged' && acc[key].status !== 'Open') acc[key].status = 'Acknowledged';

      if (new Date(alert.created_at) > new Date(acc[key].created_at)) {
        acc[key].created_at = alert.created_at;
      }
    }
    return acc;
  }, {}));

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'High': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Medium': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Low': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const acknowledgeAlert = async (idOrIds) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    await supabase.from('alerts').update({ status: 'Acknowledged' }).in('id', ids);
  };

  const resolveAlert = async (groupAlert) => {
    const ids = groupAlert.alert_ids || [groupAlert.id];
    
    // 1. Mark alerts as resolved
    await supabase.from('alerts').update({ 
      status: 'Resolved', 
      resolved_at: new Date().toISOString() 
    }).in('id', ids);
    
    // 2. Mark related work orders as completed
    await supabase.from('work_orders').update({
      status: 'Completed',
      completed_at: new Date().toISOString()
    }).in('alert_id', ids).eq('status', 'Open');

    if (groupAlert.asset_id) {
      // 3. Restore Asset Health
      await supabase.from('assets').update({
        health_score: 100,
        status: 'Running'
      }).eq('id', groupAlert.asset_id);
      
      // 4. Insert a normal sensor reading so 'Manual Data' resets to normal
      await supabase.from('sensor_data').insert({
        asset_id: groupAlert.asset_id,
        temperature: 40,
        vibration: 2,
        battery_level: 100,
        connection_status: 'Online',
        pressure: 50
      });
    }
  };

  const openAssignModal = async (alert) => {
    setAssigningAlert(alert);
    
    // Fetch technicians
    const { data: techData } = await supabase.from('profiles').select('*').eq('role', 'technician');
    
    // Fetch active work orders to calculate load
    const { data: woData } = await supabase.from('work_orders').select('assigned_technician, status');
    
    if (techData) {
      const availableTechs = techData.filter(tech => {
        let activeJobs = 0;
        if (woData) {
          woData.forEach(wo => {
            if (wo.assigned_technician === tech.id && (wo.status === 'Open' || wo.status === 'In Progress')) {
              activeJobs++;
            }
          });
        }
        return activeJobs < 2; // Only allow assigning if they have less than 2 active jobs
      });
      setTechnicians(availableTechs);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTech || !assigningAlert) return;
    setAssigning(true);
    
    try {
      const combinedIssues = assigningAlert.issues ? assigningAlert.issues.join(', ') : assigningAlert.issue;
      const primaryAlertId = assigningAlert.alert_ids ? assigningAlert.alert_ids[0] : assigningAlert.id;
      const alertIds = assigningAlert.alert_ids || [assigningAlert.id];

      // Create Work Order
      await supabase.from('work_orders').insert({
        asset_id: assigningAlert.asset_id,
        alert_id: primaryAlertId,
        issue: combinedIssues,
        priority: assigningAlert.priority,
        assigned_technician: selectedTech,
        status: 'Open',
        estimated_time: 60
      });

      // Acknowledge the alerts automatically
      await acknowledgeAlert(alertIds);
      
      setAssigningAlert(null);
      setSelectedTech('');
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Alerts</h1>
          <p className="text-muted-foreground">Monitor and respond to system anomalies.</p>
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
              placeholder="Search alerts by issue or asset..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-background border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors">
              <Filter className="w-4 h-4" />
              Filter by Priority
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-background border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors">
              Status: Open
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4">Asset & Location</th>
                <th className="px-6 py-4">Issue</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading alerts...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                    No alerts found.
                  </td>
                </tr>
              ) : (
                groupedAlerts.map((group) => (
                  <tr key={group.id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-foreground">{group.assets?.name || 'Unknown Asset'}</div>
                      <div className="text-xs text-muted-foreground">{group.assets?.location || 'Unknown Location'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {group.issues.map((issue, i) => (
                          <div key={i} className="flex items-start gap-2">
                            {group.priority === 'Critical' && <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                            <span className="font-medium text-sm">{issue}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(group.priority)}`}>
                        {group.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-1.5 mt-1">
                        {group.status === 'Open' ? (
                          <div className="w-2 h-2 rounded-full bg-destructive"></div>
                        ) : group.status === 'Acknowledged' ? (
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        )}
                        <span className="text-muted-foreground">{group.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap align-top">
                      <div className="mt-1">{format(new Date(group.created_at), 'MMM d, yyyy HH:mm:ss')}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {group.status === 'Open' && (
                          <>
                            <button 
                              onClick={() => acknowledgeAlert(group.alert_ids)}
                              className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 rounded-md transition-colors"
                            >
                              Acknowledge
                            </button>
                            <button 
                              onClick={() => openAssignModal(group)}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <UserPlus className="w-3 h-3" /> Assign
                            </button>
                          </>
                        )}
                        {(group.status === 'Open' || group.status === 'Acknowledged') && (
                          <button 
                            onClick={() => resolveAlert(group)}
                            className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white hover:bg-green-600 rounded-md transition-colors flex items-center gap-1 inline-flex"
                          >
                            <ShieldCheck className="w-3 h-3" /> Resolve
                          </button>
                        )}
                        {group.status === 'Resolved' && (
                          <span className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                            Resolved
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Technician Modal */}
      {assigningAlert && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Assign Technician
              </h3>
              <button onClick={() => setAssigningAlert(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Select a technician for: <strong>{assigningAlert.issues ? assigningAlert.issues.length : 1} issue(s)</strong> ({assigningAlert.assets?.name})
            </p>
            
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Available Technicians</label>
                <select 
                  required
                  value={selectedTech}
                  onChange={e => setSelectedTech(e.target.value)}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                >
                  <option value="" disabled>-- Select a Technician --</option>
                  {technicians.length === 0 ? (
                    <option value="" disabled>No available technicians (All are busy!)</option>
                  ) : (
                    technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setAssigningAlert(null)}
                  className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={assigning || !selectedTech}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
