'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, User, Wrench, CheckCircle, Mail, Phone, Plus, X, Loader2, Trash2 } from 'lucide-react';

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Portal State
  const [viewingTech, setViewingTech] = useState(null);
  const [techWorkOrders, setTechWorkOrders] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Create Tech State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTech, setCreatingTech] = useState(false);
  const [newTech, setNewTech] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'technician'
  });

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician');
      
    // Fetch work orders to calculate actual counts
    const { data: woData } = await supabase
      .from('work_orders')
      .select('assigned_technician, status');
    
    if (data) {
      const enrichedData = data.map(tech => {
        let active_jobs = 0;
        let completed_jobs = 0;
        
        if (woData) {
          woData.forEach(wo => {
            if (wo.assigned_technician === tech.id) {
              if (wo.status === 'Completed') {
                completed_jobs++;
              } else if (wo.status === 'Open' || wo.status === 'In Progress') {
                active_jobs++;
              }
            }
          });
        }
        
        return {
          ...tech,
          active_jobs,
          completed_jobs,
          status: active_jobs >= 2 ? 'Busy' : 'Available'
        };
      });
      setTechnicians(enrichedData);
    }
    setLoading(false);
  };

  const handleCreateTechnician = async (e) => {
    e.preventDefault();
    setCreatingTech(true);

    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          full_name: newTech.full_name,
          email: newTech.email,
          password: newTech.password,
          role: newTech.role
        }
      ]);

    setCreatingTech(false);

    if (error) {
      alert('Error creating technician: ' + error.message);
    } else {
      setShowCreateModal(false);
      setNewTech({ full_name: '', email: '', password: '', role: 'technician' });
      fetchTechnicians(); // Refresh list
    }
  };

  const handleDeleteTechnician = async (e, techId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this technician?")) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', techId);

    if (error) {
      alert("Error deleting technician: " + error.message);
    } else {
      fetchTechnicians();
    }
  };

  const openTechPortal = async (tech) => {
    setViewingTech(tech);
    setLoadingJobs(true);
    
    // Fetch actual open work orders assigned to this tech
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        assets (name, type, location)
      `)
      .eq('assigned_technician', tech.id)
      .eq('status', 'Open')
      .order('created_at', { ascending: false });
      
    if (data) setTechWorkOrders(data);
    setLoadingJobs(false);
  };

  const getDiagnostics = (issue) => {
    if (!issue) return "Inspect asset for general faults.";
    const lower = issue.toLowerCase();
    if (lower.includes('temperature')) return "1. Check coolant/refrigerant levels.\n2. Inspect compressor coil for blockages.\n3. Verify exhaust fan operation.";
    if (lower.includes('vibration')) return "1. Check for loose mounting bolts.\n2. Inspect motor bearings for wear.\n3. Verify shaft alignment.";
    if (lower.includes('battery')) return "1. Check battery connections for corrosion.\n2. Measure voltage output.\n3. Replace battery unit if below threshold.";
    if (lower.includes('offline')) return "1. Check power supply.\n2. Verify network connectivity.\n3. Restart gateway module.";
    return "1. Perform standard visual inspection.\n2. Run self-diagnostic test.\n3. Replace faulty components if necessary.";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Technicians</h1>
          <p className="text-muted-foreground">Manage your maintenance crew and their assignments.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Technician
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading technicians...</div>
        ) : technicians.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
            No technicians found. Please add users with the 'technician' role.
          </div>
        ) : (
          technicians.map(tech => (
            <div key={tech.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:border-primary/50 transition-colors group">
              <div className="p-6 pb-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold uppercase">
                    {tech.full_name ? tech.full_name.charAt(0) : tech.email.charAt(0)}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      tech.status === 'Available' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {tech.status}
                    </span>
                    <button
                      onClick={(e) => handleDeleteTechnician(e, tech.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Delete Technician"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-foreground text-lg">{tech.full_name || 'Unnamed Technician'}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{tech.email}</span>
                  </p>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border bg-secondary/30 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                    <Wrench className="w-4 h-4 text-primary" />
                    {tech.active_jobs}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Active Jobs</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {tech.completed_jobs}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
                </div>
              </div>
              <div className="px-6 py-3 border-t border-border bg-background">
                <button 
                  onClick={() => openTechPortal(tech)}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  View Job Queue
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Technician Portal Modal */}
      {viewingTech && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl rounded-xl border border-border shadow-lg flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-6 h-6 text-primary" />
                  {viewingTech.full_name}'s Portal
                </h3>
                <p className="text-sm text-muted-foreground mt-1">View assigned jobs and diagnostic instructions.</p>
              </div>
              <button onClick={() => setViewingTech(null)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-secondary/10">
              {loadingJobs ? (
                <div className="text-center py-12 text-muted-foreground">Loading your assignments...</div>
              ) : techWorkOrders.length === 0 ? (
                <div className="text-center py-12 bg-background rounded-lg border border-border">
                  <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-medium text-foreground">You're all caught up!</h4>
                  <p className="text-muted-foreground mt-1">No open work orders assigned to you right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {techWorkOrders.map(job => (
                    <div key={job.id} className="bg-background rounded-lg border border-border overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-border flex justify-between items-start bg-destructive/5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              {job.priority} PRIORITY
                            </span>
                            <span className="text-sm text-muted-foreground font-mono">WO-{job.id.split('-')[0].toUpperCase()}</span>
                          </div>
                          <h4 className="text-lg font-bold text-foreground mt-2">{job.issue}</h4>
                          <p className="text-sm font-medium text-muted-foreground mt-1">Asset: {job.assets?.name} ({job.assets?.location})</p>
                        </div>
                      </div>
                      <div className="p-4 bg-background">
                        <h5 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-blue-500" />
                          Diagnostic Instructions:
                        </h5>
                        <div className="bg-secondary/50 p-3 rounded-md border border-border/50 text-sm font-mono whitespace-pre-line text-muted-foreground">
                          {getDiagnostics(job.issue)}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <p className="text-xs text-muted-foreground italic">Note: Mark this as complete from the Work Orders page.</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Technician Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
              <h3 className="font-bold text-lg text-foreground">Add New Technician</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTechnician} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newTech.full_name}
                  onChange={(e) => setNewTech({...newTech, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={newTech.email}
                  onChange={(e) => setNewTech({...newTech, email: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  placeholder="tech@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <input 
                  type="text" 
                  required
                  value={newTech.password}
                  onChange={(e) => setNewTech({...newTech, password: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  placeholder="Enter a secure password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select 
                  value={newTech.role}
                  onChange={(e) => setNewTech({...newTech, role: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-input rounded-md text-sm font-medium text-foreground hover:bg-secondary/50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creatingTech}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                >
                  {creatingTech ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
