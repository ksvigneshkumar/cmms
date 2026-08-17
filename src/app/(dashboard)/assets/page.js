/**
 * @file page.js (Assets)
 * @description Asset management, health monitoring, and manual sensor data entry.
 * @author Vignesh K.S
 * @company CMMS Pro
 * @created 2026-08
 */
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, MoreHorizontal, Activity, Power, Trash2, MapPin, Settings2, Eye, MoreVertical, ChevronsUpDown, Cuboid, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const CATEGORIES = [
    'Production Equipment',
    'Motors & Drives',
    'Compressors & Pumps',
    'Electrical Equipment',
    'Material Handling',
    'Plumbing',
    'Electrical',
    'Facility Operations'
  ];

  // Manual Entry State
  const [simulatingAsset, setSimulatingAsset] = useState(null);
  const [temp, setTemp] = useState(40);
  const [vib, setVib] = useState(2);
  const [bat, setBat] = useState(100);
  const [volt, setVolt] = useState(220);
  const [curr, setCurr] = useState(5);
  const [press, setPress] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  // Add Asset State
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '', type: '', department: '', location: '',
    addSchedule: false, scheduleType: '', scheduleFrequency: '30 Days', scheduleNextDue: ''
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  // TODO (vignesh): Move all these Supabase fetches into custom React Query hooks next sprint. 
  // This component is getting way too bloated and re-renders are getting expensive.
  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setAssets(data);
    setLoading(false);
  };

  const openSimulateModal = async (asset) => {
    setSimulatingAsset(asset);

    // Fetch last sensor data for this asset to pre-fill the form
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('asset_id', asset.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setTemp(data.temperature !== null ? data.temperature : 40);
      setVib(data.vibration !== null ? data.vibration : 2);
      setBat(data.battery_level !== null ? data.battery_level : 100);
      setVolt(data.voltage !== null ? data.voltage : 220);
      setCurr(data.current !== null ? data.current : 5);
      setPress(data.pressure !== null ? data.pressure : 50);
    } else {
      setTemp(40);
      setVib(2);
      setBat(100);
      setVolt(220);
      setCurr(5);
      setPress(50);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.type.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || asset.department === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    if (!simulatingAsset) return;
    setSubmitting(true);

    try {
      // 1. Insert Sensor Data
      const { data: insertedData, error: sensorError } = await supabase
        .from('sensor_data')
        .insert({
          asset_id: simulatingAsset.id,
          temperature: parseFloat(temp),
          vibration: parseFloat(vib),
          battery_level: parseFloat(bat),
          voltage: parseFloat(volt),
          current: parseFloat(curr),
          connection_status: 'Online',
          pressure: parseFloat(press)
        })
        .select()
        .single();

      if (sensorError) throw sensorError;

      // 2. Business Logic for Alerts
      let newAlerts = [];

      if (simulatingAsset.type === 'Lighting') {
        if (temp >= 80) newAlerts.push({ issue: `Choke/Driver Overheating: ${temp}°C`, priority: 'High' });
        if (volt <= 180 || volt >= 260) newAlerts.push({ issue: `Voltage Fluctuation: ${volt}V`, priority: 'High' });
      } else if (simulatingAsset.type === 'Ventilation') {
        if (vib >= 7) newAlerts.push({ issue: `High Vibration/Imbalance: ${vib} mm/s`, priority: 'Critical' });
        if (temp >= 85) newAlerts.push({ issue: `Motor Overheating: ${temp}°C`, priority: 'High' });
      } else if (simulatingAsset.type === 'HVAC') {
        if (temp >= 90) newAlerts.push({ issue: `Compressor Overheating: ${temp}°C`, priority: 'Critical' });
        if (vib >= 6) newAlerts.push({ issue: `Compressor Rattling: ${vib} mm/s`, priority: 'High' });
        if (curr >= 15) newAlerts.push({ issue: `High Current Draw: ${curr}A`, priority: 'High' });
      } else if (simulatingAsset.department === 'Plumbing') {
        if (simulatingAsset.type === 'Valve') {
          if (press >= 80) newAlerts.push({ issue: `High Water Pressure: ${press} PSI`, priority: 'High' });
          if (press <= 20) newAlerts.push({ issue: `Low Water Pressure (Leak?): ${press} PSI`, priority: 'Critical' });
        } else if (simulatingAsset.type === 'Tap') {
          if (bat <= 20) newAlerts.push({ issue: `Sensor Tap Battery Low: ${bat}%`, priority: 'Low' });
          if (press <= 20) newAlerts.push({ issue: `No Water in Tap: ${press} PSI`, priority: 'Critical' });
        } else if (simulatingAsset.type === 'Pump') {
          if (vib >= 8) newAlerts.push({ issue: `Motor Cavitation/Vibration: ${vib} mm/s`, priority: 'Critical' });
          if (temp >= 85) newAlerts.push({ issue: `Motor Overheating: ${temp}°C`, priority: 'High' });
          if (curr >= 12) newAlerts.push({ issue: `Pump Overload Current: ${curr}A`, priority: 'Critical' });
        } else {
          if (press >= 80) newAlerts.push({ issue: `High Water Pressure: ${press} PSI`, priority: 'High' });
          if (press <= 20) newAlerts.push({ issue: `Low Water Pressure (Leak?): ${press} PSI`, priority: 'Critical' });
        }
      } else if (simulatingAsset.department === 'Electrical') {
        if (temp >= 75) newAlerts.push({ issue: `Panel Overheating: ${temp}°C`, priority: 'Critical' });
        if (volt <= 200 || volt >= 250) newAlerts.push({ issue: `Voltage Fluctuation: ${volt}V`, priority: 'High' });
        if (curr >= 100) newAlerts.push({ issue: `Overload Current: ${curr}A`, priority: 'Critical' });
      } else if (simulatingAsset.department === 'Facility Operations') {
        if (simulatingAsset.type === 'Camera') {
          if (volt < 11 || volt > 14) newAlerts.push({ issue: `CCTV Power Fluctuation: ${volt}V`, priority: 'High' });
          if (temp >= 70) newAlerts.push({ issue: `Camera Overheating: ${temp}°C`, priority: 'High' });
        } else if (simulatingAsset.type === 'WasteBin') {
          if (press >= 90) newAlerts.push({ issue: `Waste Bin Full: ${press}%`, priority: 'Critical' });
          if (temp >= 60) newAlerts.push({ issue: `High Temp inside Bin (Fire Risk): ${temp}°C`, priority: 'Critical' });
        }
      } else {
        if (temp >= 100) newAlerts.push({ issue: `Critical Temperature: ${temp}°C`, priority: 'Critical' });
        else if (temp >= 90) newAlerts.push({ issue: `High Temperature: ${temp}°C`, priority: 'High' });

        if (vib >= 6) newAlerts.push({ issue: `High Vibration: ${vib} mm/s`, priority: 'High' });

        if (bat <= 20) newAlerts.push({ issue: `Low Battery Warning: ${bat}%`, priority: 'Low' });
      }

      // 3. Create Alerts and update Asset Health if needed
      if (newAlerts.length > 0) {
        const alertsToInsert = newAlerts.map(a => ({
          asset_id: simulatingAsset.id,
          issue: a.issue,
          priority: a.priority,
          status: 'Open',
          sensor_reading_id: insertedData.id
        }));

        await supabase.from('alerts').insert(alertsToInsert);

        // Calculate new health score based on highest priority
        let newHealth = 100;
        let newStatus = 'Running';

        const priorities = newAlerts.map(a => a.priority);
        if (priorities.includes('Critical')) {
          newHealth = 20;
          newStatus = 'Fault';
        } else if (priorities.includes('High')) {
          newHealth = 50;
          newStatus = 'Fault';
        } else if (priorities.includes('Low')) {
          newHealth = 75; // 75 falls into the amber/yellow range
          newStatus = 'Fault';
        }

        await supabase.from('assets').update({
          health_score: newHealth,
          status: newStatus
        }).eq('id', simulatingAsset.id);

        const msgs = newAlerts.map(a => a.issue).join('\\n');
        showToast(`Warnings Generated:\\n${msgs}`, 'error');
      } else {
        // Auto-resolve any open alerts for this asset since values are now normal
        const { data: activeAlerts } = await supabase
          .from('alerts')
          .select('id')
          .eq('asset_id', simulatingAsset.id)
          .in('status', ['Open', 'Acknowledged']);

        if (activeAlerts && activeAlerts.length > 0) {
          const alertIds = activeAlerts.map(a => a.id);

          // Auto-resolve related faults since sensor readings returned to normal thresholds
          await supabase.from('alerts').update({
            status: 'Resolved',
            resolved_at: new Date().toISOString()
          }).in('id', alertIds);

          await supabase.from('work_orders').update({
            status: 'Completed',
            completed_at: new Date().toISOString()
          }).in('alert_id', alertIds).eq('status', 'Open');

          await supabase.from('assets').update({
            health_score: 100,
            status: 'Running'
          }).eq('id', simulatingAsset.id);

          showToast('Data is normal. Active alerts and work orders have been automatically resolved!', 'success');
        } else {
          showToast('Data recorded successfully. Values are normal.', 'success');
        }
      }

      setSimulatingAsset(null);
      fetchAssets(); // Refresh to show new health score
    } catch (err) {
      console.error(err);
      showToast('Error simulating data', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAssetSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { error } = await supabase.from('assets').insert({
        name: newAsset.name,
        type: newAsset.type,
        department: newAsset.department,
        location: newAsset.location,
        status: 'Running',
        health_score: 100
      });
      if (error) throw error;

      if (newAsset.addSchedule && newAsset.scheduleType && newAsset.scheduleNextDue) {
        // Insert real schedule into database
        const { error: scheduleError } = await supabase.from('preventive_schedules').insert({
          asset_name: newAsset.name,
          type: newAsset.scheduleType,
          frequency: newAsset.scheduleFrequency,
          next_due: newAsset.scheduleNextDue,
          status: 'Scheduled',
          last_checked: 'Never'
        });

        if (scheduleError) {
          console.error("Error adding schedule:", scheduleError);
          showToast(`Added ${newAsset.name} but failed to save schedule.`, 'warning');
        } else {
          showToast(`Successfully added ${newAsset.name} along with its ${newAsset.scheduleType} schedule!`, 'success');
        }
      } else {
        showToast(`Successfully added ${newAsset.name}`, 'success');
      }

      setIsAddingAsset(false);
      setNewAsset({
        name: '', type: '', department: '', location: '',
        addSchedule: false, scheduleType: '', scheduleFrequency: '30 Days', scheduleNextDue: ''
      });
      fetchAssets();
    } catch (err) {
      console.error(err);
      showToast('Error adding asset', 'error');
    } finally {
      setAdding(false);
    }
  };

  const getRunningHours = (createdAt) => {
    if (!createdAt) return 0;
    const diffMs = new Date() - new Date(createdAt);
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Production Equipment': 'bg-blue-100 text-blue-700',
      'Motors & Drives': 'bg-purple-100 text-purple-700',
      'Compressors & Pumps': 'bg-teal-100 text-teal-700',
      'Electrical Equipment': 'bg-orange-100 text-orange-700',
      'Material Handling': 'bg-yellow-100 text-yellow-700',
    };
    return colors[category] || 'bg-slate-100 text-slate-700';
  };

  const getHealthStatus = (score) => {
    if (score >= 95) return { text: 'Healthy', color: 'text-green-600' };
    if (score >= 80) return { text: 'Good', color: 'text-green-500' };
    if (score >= 50) return { text: 'Warning', color: 'text-amber-500' };
    return { text: 'Critical', color: 'text-red-600' };
  };

  const handleDeleteAsset = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;

      // Update local state to remove the deleted asset
      setAssets(assets.filter(asset => asset.id !== id));
      showToast(`${name} has been deleted successfully.`, 'success');
      fetchAssets();
    } catch (err) {
      showToast('Error deleting asset', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Assets</h1>
          <p className="text-muted-foreground">Manage and monitor all your industrial equipment.</p>
        </div>
        <button
          onClick={() => setIsAddingAsset(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md flex flex-col sm:flex-row gap-2">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
                placeholder="Search assets by name or type..."
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full sm:w-48 pl-3 pr-8 py-2 border border-input rounded-md leading-5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button className="flex items-center justify-center gap-2 px-3 py-2 bg-background border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors w-full sm:w-auto">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-6 py-4">Asset Info</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">System</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Health</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">
                    Loading assets...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">
                    No assets found.
                  </td>
                </tr>
              ) : (
                (() => {
                  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  return paginatedAssets.map((asset) => {
                    const health = getHealthStatus(asset.health_score);
                    return (
                      <tr key={asset.id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Cuboid className="w-6 h-6 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-blue-600">{asset.name}</div>
                            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{asset.id.split('-')[0].substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(asset.department)}`}>
                          {asset.department || asset.type || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <div className="font-medium text-slate-700">{asset.location || 'Main Floor'}</div>
                            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">LOC-{asset.id.substring(0, 4)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <Settings2 className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <div className="font-medium text-slate-700">{asset.type || 'System'}</div>
                            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">SYS-{asset.id.substring(4, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${asset.status === 'Running' ? 'bg-green-50 text-green-700 border-green-200' :
                            asset.status === 'Fault' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'Running' ? 'bg-green-500' : asset.status === 'Fault' ? 'bg-red-500' : 'bg-slate-500'}`}></span>
                          {asset.status === 'Running' ? 'Running' : asset.status === 'Fault' ? 'Fault' : 'Idle'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className={`font-semibold ${health.color}`}>{health.text}</div>
                          <div className="text-sm text-slate-500 mt-1">{asset.health_score}%</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openSimulateModal(asset)}
                            className="flex items-center gap-1.5 text-sm font-semibold text-amber-500 hover:text-amber-700 transition-colors"
                            title="Manual Data Entry"
                          >
                            <Power className="w-4 h-4" /> Data
                          </button>
                          <Link
                            href={`/assets/${asset.id}`}
                            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" /> View
                          </Link>
                          <button
                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground bg-white">
          <div>
            Showing {filteredAssets.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAssets.length)} of {filteredAssets.length} assets
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center border border-border rounded-md hover:bg-slate-50 disabled:opacity-50 text-slate-400"
            >&lt;</button>
            
            {Array.from({ length: Math.ceil(filteredAssets.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center rounded-md font-medium transition-colors ${
                  currentPage === page 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-transparent hover:bg-slate-50 text-slate-600'
                }`}
              >
                {page}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(Math.min(Math.ceil(filteredAssets.length / itemsPerPage), currentPage + 1))}
              disabled={currentPage === Math.ceil(filteredAssets.length / itemsPerPage) || Math.ceil(filteredAssets.length / itemsPerPage) === 0}
              className="w-8 h-8 flex items-center justify-center border border-border rounded-md hover:bg-slate-50 disabled:opacity-50 text-slate-400"
            >&gt;</button>
          </div>
        </div>
      </div>

      {/* Manual Data Entry Modal */}
      {simulatingAsset && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center gap-2">
              <Power className="w-5 h-5 text-amber-500" />
              Manual Sensor Entry
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter manual sensor readings for <strong>{simulatingAsset.name}</strong>. This will trigger alerts if thresholds are exceeded.
            </p>

            <form onSubmit={handleSimulateSubmit} className="space-y-4">

              {/* Lighting Fields */}
              {simulatingAsset.type === 'Lighting' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 80 = High Alert</label>
                    <input
                      type="number"
                      required
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Voltage (V) &lt;= 180 or &gt;= 260 = High Alert</label>
                    <input
                      type="number"
                      required
                      value={volt}
                      onChange={e => setVolt(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                </>
              )}

              {/* Ventilation Fields */}
              {simulatingAsset.type === 'Ventilation' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vibration (mm/s) &gt;= 7 = Critical Alert</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={vib}
                      onChange={e => setVib(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 85 = High Alert</label>
                    <input
                      type="number"
                      required
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                </>
              )}

              {/* HVAC Fields */}
              {simulatingAsset.type === 'HVAC' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 90 = Critical Alert</label>
                    <input
                      type="number"
                      required
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vibration (mm/s) &gt;= 6 = High Alert</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={vib}
                      onChange={e => setVib(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Current (A) &gt;= 15 = High Alert</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={curr}
                      onChange={e => setCurr(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                </>
              )}

              {/* Plumbing Fields */}
              {simulatingAsset.department === 'Plumbing' && (
                <>
                  {simulatingAsset.type === 'Pump' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Vibration (mm/s) &gt;= 8 = Critical Alert</label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          value={vib}
                          onChange={e => setVib(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 85 = High Alert</label>
                        <input
                          type="number"
                          required
                          value={temp}
                          onChange={e => setTemp(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Current (A) &gt;= 12 = Critical Alert</label>
                        <input
                          type="number"
                          required
                          step="0.1"
                          value={curr}
                          onChange={e => setCurr(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                    </>
                  )}

                  {simulatingAsset.type === 'Tap' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Battery Level (%) &lt;= 20 = Low Alert</label>
                        <input
                          type="number"
                          required
                          max="100"
                          min="0"
                          value={bat}
                          onChange={e => setBat(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Water Pressure (PSI) &lt;= 20 = Alert</label>
                        <input
                          type="number"
                          required
                          value={press}
                          onChange={e => setPress(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                    </>
                  )}

                  {(simulatingAsset.type === 'Valve' || (simulatingAsset.type !== 'Pump' && simulatingAsset.type !== 'Tap')) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Water Pressure (PSI) &gt;= 80 or &lt;= 20 = Alert</label>
                      <input
                        type="number"
                        required
                        value={press}
                        onChange={e => setPress(e.target.value)}
                        className="w-full border border-input rounded-md p-2 bg-background text-sm"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Electrical Fields */}
              {simulatingAsset.department === 'Electrical' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Voltage (V) &lt;= 200 or &gt;= 250 = Alert</label>
                    <input
                      type="number"
                      required
                      value={volt}
                      onChange={e => setVolt(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Current (A) &gt;= 100 = Critical Alert</label>
                    <input
                      type="number"
                      required
                      value={curr}
                      onChange={e => setCurr(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 75 = Critical Alert</label>
                    <input
                      type="number"
                      required
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                </>
              )}

              {/* Facility Operations Fields */}
              {simulatingAsset.department === 'Facility Operations' && (
                <>
                  {simulatingAsset.type === 'Camera' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Voltage (V) &lt; 11 or &gt; 14 = Alert</label>
                        <input
                          type="number"
                          required
                          value={volt}
                          onChange={e => setVolt(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 70 = High Alert</label>
                        <input
                          type="number"
                          required
                          value={temp}
                          onChange={e => setTemp(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                    </>
                  )}
                  {simulatingAsset.type === 'WasteBin' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fill Level (%) &gt;= 90 = Critical Alert</label>
                        <input
                          type="number"
                          required
                          value={press}
                          onChange={e => setPress(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 60 = Critical Alert</label>
                        <input
                          type="number"
                          required
                          value={temp}
                          onChange={e => setTemp(e.target.value)}
                          className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Default Fields */}
              {simulatingAsset.type !== 'Lighting' && simulatingAsset.type !== 'Ventilation' && simulatingAsset.type !== 'HVAC' && simulatingAsset.department !== 'Plumbing' && simulatingAsset.department !== 'Electrical' && simulatingAsset.department !== 'Facility Operations' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature (°C) &gt;= 90 = High Alert</label>
                    <input
                      type="number"
                      required
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vibration (mm/s) &gt;= 6 = High Alert</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={vib}
                      onChange={e => setVib(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Battery Level (%) &lt;= 20 = Low Alert</label>
                    <input
                      type="number"
                      required
                      max="100"
                      min="0"
                      value={bat}
                      onChange={e => setBat(e.target.value)}
                      className="w-full border border-input rounded-md p-2 bg-background text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setSimulatingAsset(null)}
                  className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : 'Simulate Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddingAsset && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add New Asset
            </h3>

            <form onSubmit={handleAddAssetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={newAsset.name}
                  onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  placeholder="e.g. Motor-05"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <input
                  type="text"
                  required
                  value={newAsset.type}
                  onChange={e => setNewAsset({ ...newAsset, type: e.target.value })}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  placeholder="e.g. HVAC, Pump, Generator"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  required
                  value={newAsset.department}
                  onChange={e => setNewAsset({ ...newAsset, department: e.target.value })}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                >
                  <option value="" disabled>Select Category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={newAsset.location}
                  onChange={e => setNewAsset({ ...newAsset, location: e.target.value })}
                  className="w-full border border-input rounded-md p-2 bg-background text-sm"
                  placeholder="e.g. Floor 1, Basement"
                />
              </div>

              <div className="pt-4 mt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="add-schedule"
                    checked={newAsset.addSchedule}
                    onChange={e => setNewAsset({ ...newAsset, addSchedule: e.target.checked })}
                    className="rounded border-input"
                  />
                  <label htmlFor="add-schedule" className="text-sm font-medium">Add Preventive Maintenance Schedule</label>
                </div>

                {newAsset.addSchedule && (
                  <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                    <div>
                      <label className="block text-sm font-medium mb-1">Maintenance Type</label>
                      <input
                        type="text"
                        required={newAsset.addSchedule}
                        value={newAsset.scheduleType}
                        onChange={e => setNewAsset({ ...newAsset, scheduleType: e.target.value })}
                        className="w-full border border-input rounded-md p-2 bg-background text-sm"
                        placeholder="e.g. Oil Change, Calibration"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Frequency</label>
                      <select
                        value={newAsset.scheduleFrequency}
                        onChange={e => setNewAsset({ ...newAsset, scheduleFrequency: e.target.value })}
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
                        required={newAsset.addSchedule}
                        value={newAsset.scheduleNextDue}
                        onChange={e => setNewAsset({ ...newAsset, scheduleNextDue: e.target.value })}
                        className="w-full border border-input rounded-md p-2 bg-background text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddingAsset(false)}
                  className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {adding ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 max-w-sm ${
            toast.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
            toast.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600' :
            'bg-green-500/10 border-green-500/20 text-green-600'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : 
             toast.type === 'warning' ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> :
             <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
             <div className="flex-1">
                {toast.message.split('\\n').map((line, i) => <div key={i} className="text-sm font-medium">{line}</div>)}
             </div>
             <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 shrink-0">
               <X className="w-4 h-4" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
