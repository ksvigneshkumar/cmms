'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Filter, 
  Plus, 
  ClipboardSignature, 
  ShieldCheck, 
  Timer, 
  CalendarDays
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WorkOrdersPage() {
  const router = useRouter();
  
  // Work Orders State
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [completingOrder, setCompletingOrder] = useState(null);
  const [resolution, setResolution] = useState('');
  const [timeTaken, setTimeTaken] = useState(0);
  const [cost, setCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Create Modal State
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [assetsList, setAssetsList] = useState([]);
  const [techList, setTechList] = useState([]);
  const [newOrder, setNewOrder] = useState({
    asset_id: '',
    issue: '',
    priority: 'Medium',
    assigned_technician: '',
    estimated_time: 60
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkOrders(true);
    
    const subscription = supabase
      .channel('work-orders-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
        fetchWorkOrders(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchWorkOrders = async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          assets (name),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (data) setWorkOrders(data);
    } catch (err) {
      console.error("Error fetching work orders:", err);
      setWorkOrders([]);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const filteredOrders = workOrders.filter(order => 
    order.issue.toLowerCase().includes(search.toLowerCase()) || 
    (order.assets?.name && order.assets.name.toLowerCase().includes(search.toLowerCase()))
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-destructive';
      case 'High': return 'text-amber-500';
      case 'Medium': return 'text-blue-500';
      case 'Low': return 'text-slate-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'In Progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Cancelled': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const handleStartWork = async (id) => {
    try {
      await supabase.from('work_orders').update({
        status: 'In Progress'
      }).eq('id', id);
      fetchWorkOrders();
    } catch (err) {
      console.error("Error starting work:", err);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!completingOrder) return;
    
    setSubmitting(true);
    
    try {
      // 1. Update Work Order
      await supabase.from('work_orders').update({
        status: 'Completed',
        completed_at: new Date().toISOString()
      }).eq('id', completingOrder.id);

      // 2. Insert into Maintenance History
      await supabase.from('maintenance_history').insert({
        asset_id: completingOrder.asset_id,
        work_order_id: completingOrder.id,
        issue: completingOrder.issue,
        resolution: resolution || 'Standard maintenance performed.',
        time_taken: parseInt(timeTaken),
        maintenance_cost: parseFloat(cost),
        technician_id: completingOrder.assigned_technician
      });

      // 3. Resolve the linked Alert if exists
      if (completingOrder.alert_id) {
        await supabase.from('alerts').update({
          status: 'Resolved',
          resolved_at: new Date().toISOString()
        }).eq('id', completingOrder.alert_id);
      }

      // 4. Normalize Sensor Data
      await supabase.from('sensor_data').insert({
        asset_id: completingOrder.asset_id,
        temperature: 40,
        vibration: 2.0,
        battery_level: 100,
        connection_status: 'Online',
        pressure: 50
      });

      // 5. Restore Asset Health Score
      await supabase.from('assets').update({
        health_score: 100,
        status: 'Running'
      }).eq('id', completingOrder.asset_id);

      // Cleanup
      setCompletingOrder(null);
      setResolution('');
      setTimeTaken(0);
      setCost(0);
      fetchWorkOrders();
    } catch (err) {
      console.error("Error completing work order:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = async () => {
    setCreatingOrder(true);
    try {
      const [{ data: aData }, { data: tData }] = await Promise.all([
        supabase.from('assets').select('id, name'),
        supabase.from('profiles').select('id, full_name').eq('role', 'technician')
      ]);
      if (aData) setAssetsList(aData);
      if (tData) setTechList(tData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await supabase.from('work_orders').insert({
        asset_id: newOrder.asset_id,
        issue: newOrder.issue,
        priority: newOrder.priority,
        assigned_technician: newOrder.assigned_technician || null,
        status: 'Open',
        estimated_time: parseInt(newOrder.estimated_time) || 60,
      });
      setCreatingOrder(false);
      setNewOrder({
        asset_id: '',
        issue: '',
        priority: 'Medium',
        assigned_technician: '',
        estimated_time: 60
      });
      // realtime subscription will fetch the new work order
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Work Orders</h1>
          <p className="text-muted-foreground">Manage and track active maintenance tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Work Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <ClipboardSignature className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Open</p>
            <p className="text-2xl font-bold text-foreground">{workOrders.filter(w => w.status === 'Open').length}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-foreground">{workOrders.filter(w => w.status === 'In Progress').length}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completed (30d)</p>
            <p className="text-2xl font-bold text-foreground">{workOrders.filter(w => w.status === 'Completed').length}</p>
          </div>
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
              placeholder="Search work orders by issue or asset..."
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
                <th className="px-6 py-4">ID & Asset</th>
                <th className="px-6 py-4">Issue</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading work orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                    No work orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">WO-{order.id.split('-')[0].toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{order.assets?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${order.priority === 'Critical' ? 'bg-destructive' : order.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <span className="font-medium truncate" title={order.issue}>{order.issue}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {order.profiles ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase">
                              {order.profiles.full_name.charAt(0)}
                            </div>
                            <span className="text-muted-foreground">{order.profiles.full_name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === 'Open' && (
                          <button 
                            onClick={() => handleStartWork(order.id)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors flex items-center gap-1"
                          >
                            Start Work
                          </button>
                        )}
                        {order.status === 'In Progress' && (
                          <button 
                            onClick={() => {
                              // Calculate actual minutes since creation
                              const createdTime = new Date(order.created_at);
                              const now = new Date();
                              const diffMins = Math.max(1, Math.floor((now - createdTime) / (1000 * 60)));
                              setTimeTaken(diffMins);
                              setCompletingOrder(order);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3 h-3" /> Complete
                          </button>
                        )}
                        {order.status === 'Completed' && (
                          <span className="text-xs font-medium text-green-500 flex items-center gap-1 justify-end">
                            <ShieldCheck className="w-3 h-3" /> Done
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

      {/* Completion Modal */}
      {completingOrder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Complete Work Order</h3>
            <p className="text-sm text-muted-foreground mb-4">
              WO-{completingOrder.id.split('-')[0].toUpperCase()} ({completingOrder.assets?.name})
            </p>
            
            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Resolution Details</label>
                <textarea 
                  required
                  rows={3}
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  placeholder="How was this fixed?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Time Taken (mins)</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={timeTaken}
                    onChange={e => setTimeTaken(e.target.value)}
                    className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost ($)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                    className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setCompletingOrder(null)}
                  className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : 'Mark as Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {creatingOrder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Create Manual Work Order</h3>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset</label>
                <select 
                  required
                  value={newOrder.asset_id}
                  onChange={e => setNewOrder({...newOrder, asset_id: e.target.value})}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                >
                  <option value="" disabled>Select Asset</option>
                  {assetsList.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Issue Description</label>
                <input 
                  type="text" 
                  required
                  value={newOrder.issue}
                  onChange={e => setNewOrder({...newOrder, issue: e.target.value})}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  placeholder="e.g. Broken fan belt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select 
                    value={newOrder.priority}
                    onChange={e => setNewOrder({...newOrder, priority: e.target.value})}
                    className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Est. Time (mins)</label>
                  <input 
                    type="number" 
                    required
                    min="5"
                    value={newOrder.estimated_time}
                    onChange={e => setNewOrder({...newOrder, estimated_time: e.target.value})}
                    className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Assign Technician</label>
                <select 
                  required
                  value={newOrder.assigned_technician}
                  onChange={e => setNewOrder({...newOrder, assigned_technician: e.target.value})}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                >
                  <option value="" disabled>Select Technician</option>
                  {techList.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setCreatingOrder(false)}
                  className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
