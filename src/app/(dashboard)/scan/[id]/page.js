'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Cuboid, AlertCircle, Calendar, Wrench, ShieldCheck, MapPin, Settings2, User, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AssetProfilePage({ params }) {
  const [asset, setAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAssetProfile() {
      try {
        const { id } = params;

        // 1. Fetch Asset Details
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select('*')
          .eq('id', id)
          .single();

        if (assetError) throw assetError;
        setAsset(assetData);

        // 2. Fetch Maintenance History (Last Updated By)
        const { data: historyData, error: historyError } = await supabase
          .from('maintenance_history')
          .select('*, profiles(full_name)')
          .eq('asset_id', id)
          .order('completed_at', { ascending: false });

        if (historyError) throw historyError;
        setHistory(historyData || []);

      } catch (err) {
        console.error("Error fetching asset profile:", err);
        setError("Asset not found or access denied.");
      } finally {
        setLoading(false);
      }
    }

    fetchAssetProfile();
  }, [params]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Error Loading Asset</h2>
        <p className="text-muted-foreground">{error}</p>
        <Link href="/dashboard" className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-md font-medium">Return to Dashboard</Link>
      </div>
    );
  }

  const lastUpdate = history.length > 0 ? history[0] : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Digital Asset Profile</h1>
          <p className="text-muted-foreground text-sm">Scanned via QR Code</p>
        </div>
      </div>

      {/* Asset Core Details */}
      <div className="glass-card rounded-3xl overflow-hidden p-6 relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Cuboid className="w-48 h-48" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black text-foreground">{asset.name}</h2>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${asset.status === 'Running' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  asset.status === 'Fault' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'Running' ? 'bg-emerald-500' : asset.status === 'Fault' ? 'bg-rose-500' : 'bg-slate-500'}`}></span>
                {asset.status}
              </span>
            </div>
            <p className="text-sm font-medium text-indigo-600 mb-6 uppercase tracking-wider">{asset.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</div>
            <div className="font-medium text-foreground">{asset.location}</div>
          </div>
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider flex items-center gap-1"><Settings2 className="w-3 h-3"/> Type</div>
            <div className="font-medium text-foreground">{asset.type}</div>
          </div>
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3"/> Department</div>
            <div className="font-medium text-foreground">{asset.department}</div>
          </div>
          <div className="bg-secondary/30 p-4 rounded-xl">
            <div className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider flex items-center gap-1"><Activity className="w-3 h-3"/> Health</div>
            <div className="font-medium text-foreground">{asset.health_score}%</div>
          </div>
        </div>
      </div>

      {/* Quick Actions (For Technicians) */}
      <div className="flex gap-4">
        <Link href="/work-orders" className="flex-1 bg-indigo-600 text-white rounded-xl py-3 px-4 font-semibold text-center hover:bg-indigo-700 transition-colors shadow-md">
          Report Issue / Create Work Order
        </Link>
      </div>

      {/* Maintenance History Timeline */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-500" /> 
          Service History
        </h3>
        
        {history.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
            No maintenance records found for this asset.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record, index) => (
              <div key={record.id} className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                {index === 0 && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Latest Update
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">{record.issue}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(record.completed_at), 'PPP')} at {format(new Date(record.completed_at), 'p')}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-secondary/50 p-3 rounded-lg">
                  {record.resolution}
                </p>
                
                <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {record.profiles?.full_name ? record.profiles.full_name.charAt(0) : '?'}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {record.profiles?.full_name || 'Unknown Technician'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {record.time_taken} mins</span>
                    <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3.5 h-3.5" /> Completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
