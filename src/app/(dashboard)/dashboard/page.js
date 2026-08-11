'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  TrendingUp,
  Users,
  ClipboardList,
  Calendar,
  PlayCircle,
  Loader2,
  Settings as SettingsIcon,
  Plus
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    runningAssets: 0,
    faultAssets: 0,
    activeAlerts: 0,
    openWorkOrders: 0,
    completedWorkOrders: 0,
    availableTechnicians: 12, // Still mock for now, but rest are real
  });

  const [tempTrend, setTempTrend] = useState([]);
  const [healthData, setHealthData] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  
  // Preventive Maintenance State
  const [schedules, setSchedules] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ asset: '', type: '', frequency: '30 Days', nextDue: '' });

  const handleGeneratePreventiveWO = (id) => {
    setGenerating(id);
    setTimeout(() => {
      setSchedules(schedules.filter(s => s.id !== id));
      setGenerating(null);
    }, 1500);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!newSchedule.asset || !newSchedule.type || !newSchedule.nextDue) return;
    
    try {
      const { data, error } = await supabase.from('preventive_schedules').insert({
        asset_name: newSchedule.asset,
        type: newSchedule.type,
        frequency: newSchedule.frequency,
        next_due: newSchedule.nextDue,
        status: 'Scheduled',
        last_checked: 'Never'
      }).select().single();
      
      if (error) throw error;
      setSchedules([data, ...schedules]);
    } catch (err) {
      console.error(err);
      alert('Failed to save schedule');
    }
    
    setIsAddingSchedule(false);
    setNewSchedule({ asset: '', type: '', frequency: '30 Days', nextDue: '' });
  };

  // Fetch real data
  useEffect(() => {
    const fetchRealStats = async () => {
      // Fetch Asset counts
      const { count: totalAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true });
      const { count: runningAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'Running');
      const { count: faultAssets } = await supabase.from('assets').select('*', { count: 'exact', head: true }).in('status', ['Fault', 'Maintenance']);
      
      // Fetch Alerts counts
      const { count: activeAlerts } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).in('status', ['Open', 'Acknowledged']);
      
      // Fetch Work Orders counts
      const { count: openWorkOrders } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).in('status', ['Open', 'In Progress']);
      const { count: completedWorkOrders } = await supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('status', 'Completed');

      // Fetch Technicians count
      const { count: availableTechnicians } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'technician');

      // Update state
      setStats({
        totalAssets: totalAssets || 0,
        runningAssets: runningAssets || 0,
        faultAssets: faultAssets || 0,
        activeAlerts: activeAlerts || 0,
        openWorkOrders: openWorkOrders || 0,
        completedWorkOrders: completedWorkOrders || 0,
        availableTechnicians: availableTechnicians || 0
      });

      // Fetch Recent Alerts for the sidebar
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*, assets(name)')
        .in('status', ['Open', 'Acknowledged'])
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (alertsData) {
        setRecentAlerts(alertsData.map(a => ({
          id: a.id,
          asset: a.assets?.name || 'Unknown',
          issue: a.issue,
          time: 'Just now' // Normally we'd calculate timeAgo here
        })));
      }
    };

    fetchRealStats();

    const fetchSchedules = async () => {
      const { data, error } = await supabase
        .from('preventive_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data && !error) setSchedules(data);
    };
    
    fetchSchedules();
    // Dummy Data for charts
    const dummyTemp = Array.from({ length: 24 }).map((_, i) => ({
      time: `${i}:00`,
      temp: 65 + Math.random() * 20 + (i === 14 ? 15 : 0) // Spikes at 14:00
    }));
    setTempTrend(dummyTemp);

    setHealthData([
      { name: 'Healthy (90-100)', value: 12 },
      { name: 'Warning (70-89)', value: 5 },
      { name: 'Critical (<70)', value: 3 },
    ]);

    setRecentAlerts([
      { id: '1', asset: 'Motor-01', issue: 'High Temperature Detected (95°C)', priority: 'Critical', time: '10 mins ago' },
      { id: '2', asset: 'Pump-02', issue: 'Vibration Anomaly (8.5 mm/s)', priority: 'High', time: '25 mins ago' },
      { id: '3', asset: 'Boiler-01', issue: 'Pressure Above Threshold', priority: 'High', time: '1 hour ago' },
      { id: '4', asset: 'Conveyor-01', issue: 'Low Battery Warning (15%)', priority: 'Medium', time: '2 hours ago' },
    ]);

    // Setup Supabase Realtime for stats and alerts
    const channel = supabase.channel('dashboard_metrics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        // Handle new alert
        console.log('New alert!', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground">Monitor your factory operations and asset health in realtime.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Assets" value={stats.totalAssets} icon={Settings} trend="+2 this month" />
        <KpiCard title="Active Alerts" value={stats.activeAlerts} icon={AlertTriangle} trend="+3 today" trendColor="text-destructive" />
        <KpiCard title="Open Work Orders" value={stats.openWorkOrders} icon={Clock} trend="-2 from yesterday" trendColor="text-green-500" />
        <KpiCard title="Available Technicians" value={stats.availableTechnicians} icon={Users} trend="3 on shift" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Temperature Trend (Average)</h3>
              <select className="bg-background border border-input rounded-md text-sm px-2 py-1">
                <option>Today</option>
                <option>Last 7 Days</option>
              </select>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
              <h3 className="font-semibold text-foreground mb-4">Asset Health Distribution</h3>
              <div className="h-[250px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {healthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-sm mt-2">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div>Healthy</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div>Warning</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div>Critical</div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <h3 className="font-semibold text-foreground mb-4">Asset Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Running
                  </span>
                  <span className="font-medium">{stats.runningAssets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Fault
                  </span>
                  <span className="font-medium">{stats.faultAssets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Maintenance
                  </span>
                  <span className="font-medium">{stats.totalAssets - stats.runningAssets - stats.faultAssets}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Activity & Alerts) */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Alerts</h3>
              <button className="text-sm text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {recentAlerts.map(alert => (
                <div key={alert.id} className="p-3 rounded-lg bg-background border border-border flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.priority === 'Critical' ? 'bg-destructive' : alert.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm text-foreground">{alert.asset}</span>
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.issue}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 rounded-lg border border-border bg-background hover:bg-accent text-sm font-medium transition-colors flex flex-col items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Resolve Alert
              </button>
              <button className="p-3 rounded-lg border border-border bg-background hover:bg-accent text-sm font-medium transition-colors flex flex-col items-center justify-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                New Work Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preventive Maintenance Section */}
      <div className="space-y-4 pt-6 mt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Upcoming Preventive Maintenance
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Manage scheduled maintenance to prevent downtime.</p>
          </div>
          <button 
            onClick={() => setIsAddingSchedule(true)}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        </div>
        
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Asset</th>
                  <th className="px-6 py-4 font-medium">Maintenance Type</th>
                  <th className="px-6 py-4 font-medium">Frequency</th>
                  <th className="px-6 py-4 font-medium">Last Checked</th>
                  <th className="px-6 py-4 font-medium">Next Due</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedules.map(schedule => (
                  <tr key={schedule.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{schedule.asset_name}</td>
                    <td className="px-6 py-4">{schedule.type}</td>
                    <td className="px-6 py-4 flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {schedule.frequency}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{schedule.last_checked}</td>
                    <td className="px-6 py-4 font-medium">{schedule.next_due}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        schedule.status === 'Overdue' ? 'bg-destructive/10 text-destructive' :
                        schedule.status === 'Due Today' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-green-500/10 text-green-500'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleGeneratePreventiveWO(schedule.id)}
                        disabled={generating === schedule.id || schedule.status === 'Scheduled'}
                        className="inline-flex items-center justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generating === schedule.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlayCircle className="w-3.5 h-3.5" />
                        )}
                        Generate WO
                      </button>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-muted-foreground">
                      No preventive maintenance schedules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add New Schedule Modal */}
      {isAddingSchedule && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Preventive Schedule
            </h3>
            
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name</label>
                <input 
                  type="text" 
                  required
                  value={newSchedule.asset}
                  onChange={e => setNewSchedule({...newSchedule, asset: e.target.value})}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  placeholder="e.g. Motor-05"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Maintenance Type</label>
                <input 
                  type="text" 
                  required
                  value={newSchedule.type}
                  onChange={e => setNewSchedule({...newSchedule, type: e.target.value})}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  placeholder="e.g. Oil Change, Calibration"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <select 
                  value={newSchedule.frequency}
                  onChange={e => setNewSchedule({...newSchedule, frequency: e.target.value})}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                >
                  <option value="7 Days">Weekly (7 Days)</option>
                  <option value="14 Days">Bi-Weekly (14 Days)</option>
                  <option value="30 Days">Monthly (30 Days)</option>
                  <option value="90 Days">Quarterly (90 Days)</option>
                  <option value="365 Days">Yearly (365 Days)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">First Due Date</label>
                <input 
                  type="date" 
                  required
                  value={newSchedule.nextDue}
                  onChange={e => setNewSchedule({...newSchedule, nextDue: e.target.value})}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddingSchedule(false)}
                  className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, trend, trendColor = "text-muted-foreground" }) {
  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16 text-primary" />
      </div>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        <span className={`text-xs ${trendColor} flex items-center gap-1`}>
          {trend.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : null}
          {trend}
        </span>
      </div>
    </div>
  );
}
