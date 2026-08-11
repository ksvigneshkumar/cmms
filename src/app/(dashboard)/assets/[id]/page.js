'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Activity, 
  AlertTriangle, 
  ArrowLeft, 
  Settings, 
  Thermometer, 
  Battery, 
  Wifi, 
  Wind 
} from 'lucide-react';
import Link from 'next/link';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';

export default function AssetDetailsPage({ params }) {
  const { id } = use(params);
  const [asset, setAsset] = useState(null);
  const [sensorData, setSensorData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetDetails();
    
    // Subscribe to realtime sensor data
    const sensorSubscription = supabase
      .channel(`asset-${id}-sensors`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sensor_data',
        filter: `asset_id=eq.${id}` 
      }, (payload) => {
        const newReading = {
          time: format(new Date(payload.new.timestamp), 'HH:mm:ss'),
          temp: payload.new.temperature,
          vibration: payload.new.vibration,
          battery: payload.new.battery_level
        };
        setSensorData(prev => [...prev.slice(-19), newReading]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sensorSubscription);
    };
  }, [id]);

  const fetchAssetDetails = async () => {
    setLoading(true);
    
    // Fetch Asset Info
    const { data: assetData } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (assetData) {
      setAsset(assetData);
    }

    // Fetch historical sensor data
    const { data: historyData } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('asset_id', id)
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (historyData) {
      const formatted = historyData.reverse().map(d => ({
        time: format(new Date(d.timestamp), 'HH:mm:ss'),
        temp: d.temperature,
        vibration: d.vibration,
        battery: d.battery_level
      }));
      setSensorData(formatted);
    }

    // Fetch Active Alerts
    const { data: alertsData } = await supabase
      .from('alerts')
      .select('*')
      .eq('asset_id', id)
      .eq('status', 'Open')
      .order('created_at', { ascending: false });
    
    if (alertsData) {
      setAlerts(alertsData);
    }
    
    setLoading(false);
  };

  if (loading && !asset) {
    return (
      <div className="flex items-center justify-center h-64 text-primary">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!asset) {
    return <div className="text-center p-12 text-muted-foreground">Asset not found.</div>;
  }

  const latestReading = sensorData.length > 0 ? sensorData[sensorData.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assets" className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{asset.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              asset.status === 'Running' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
              asset.status === 'Fault' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
              'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              {asset.status}
            </span>
          </div>
          <p className="text-muted-foreground">{asset.type} • {asset.department} • {asset.location}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Thermometer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Temperature</p>
            <p className="text-2xl font-bold text-foreground">
              {latestReading ? `${latestReading.temp.toFixed(1)}°C` : '--'}
            </p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Wind className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vibration</p>
            <p className="text-2xl font-bold text-foreground">
              {latestReading ? `${latestReading.vibration.toFixed(2)} mm/s` : '--'}
            </p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
            <Battery className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Battery Level</p>
            <p className="text-2xl font-bold text-foreground">
              {latestReading ? `${latestReading.battery.toFixed(0)}%` : '--'}
            </p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold text-foreground">Online</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Live Sensor Chart */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">Live Sensor Data</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                  />
                  <Line 
                    type="monotone" 
                    name="Temperature (°C)"
                    dataKey="temp" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    name="Vibration"
                    dataKey="vibration" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">Asset Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Manufacturer</p>
                <p className="font-medium">{asset.manufacturer || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Model Number</p>
                <p className="font-medium">{asset.model_number || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Purchase Date</p>
                <p className="font-medium">{asset.purchase_date || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Warranty Expiry</p>
                <p className="font-medium">{asset.warranty_expiry || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Active Alerts</h3>
              <span className="bg-destructive/10 text-destructive text-xs font-bold px-2 py-1 rounded-full">
                {alerts.length}
              </span>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active alerts</p>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="p-3 rounded-lg bg-background border border-border relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.priority === 'Critical' ? 'bg-destructive' : alert.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm text-foreground">{alert.issue}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Recent Maintenance</h3>
              <Link href={`/history?asset=${asset.id}`} className="text-sm text-primary hover:underline">View All</Link>
            </div>
            {/* Dummy history */}
            <div className="space-y-4">
              <div className="relative pl-4 border-l-2 border-border">
                <div className="absolute w-3 h-3 bg-secondary rounded-full -left-[7px] top-1 border-2 border-background"></div>
                <p className="text-sm font-medium text-foreground">Routine Inspection</p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed on Jun 15, 2026</p>
              </div>
              <div className="relative pl-4 border-l-2 border-border">
                <div className="absolute w-3 h-3 bg-secondary rounded-full -left-[7px] top-1 border-2 border-background"></div>
                <p className="text-sm font-medium text-foreground">Filter Replacement</p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed on May 02, 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
