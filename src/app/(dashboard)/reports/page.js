'use client';

import { useState } from 'react';
import { Download, FileText, PieChart, TrendingUp, BarChart2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(null);

  const reports = [
    { id: 1, title: 'Monthly Maintenance Summary', description: 'Overview of all maintenance activities, costs, and downtime for the current month.', type: 'CSV', icon: FileText },
    { id: 2, title: 'Asset Health & Performance', description: 'Detailed analysis of equipment health scores, failure rates, and MTTF.', type: 'CSV', icon: PieChart },
    { id: 3, title: 'Technician Performance', description: 'Metrics on jobs completed, average repair time, and SLA adherence by technician.', type: 'CSV', icon: TrendingUp },
    { id: 4, title: 'Alerts & Anomalies Log', description: 'Complete log of all system alerts triggered by the IoT engine.', type: 'CSV', icon: BarChart2 },
  ];

  const triggerDownload = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (reportId) => {
    setDownloading(reportId);
    try {
      if (reportId === 1) {
        // Monthly Maintenance Summary
        const { data, error } = await supabase.from('work_orders').select('*, assets(name), profiles(full_name)');
        if (error) throw error;
        
        let csv = 'ID,Asset,Issue,Priority,Status,Assigned Technician,Created Date,Completed Date\n';
        data.forEach(row => {
          csv += `${row.id},"${row.assets?.name || ''}","${row.issue || ''}",${row.priority},${row.status},"${row.profiles?.full_name || 'Unassigned'}",${row.created_at},${row.completed_at || ''}\n`;
        });
        triggerDownload(`Maintenance_Summary_${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);

      } else if (reportId === 2) {
        // Asset Health
        const { data, error } = await supabase.from('assets').select('*');
        if (error) throw error;
        
        let csv = 'Asset ID,Name,Type,Location,Status,Health Score,Last Maintenance\n';
        data.forEach(row => {
          csv += `${row.id},"${row.name}","${row.type}","${row.location}",${row.status},${row.health_score},${row.last_maintenance || ''}\n`;
        });
        triggerDownload(`Asset_Health_${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);
        
      } else if (reportId === 3) {
        // Technician Performance
        const { data: techs } = await supabase.from('profiles').select('*').eq('role', 'technician');
        const { data: history } = await supabase.from('maintenance_history').select('*');
        
        let csv = 'Technician Name,Jobs Completed,Total Time (mins),Total Cost ($)\n';
        if (techs && history) {
          techs.forEach(tech => {
            const techJobs = history.filter(h => h.technician_id === tech.id);
            const totalTime = techJobs.reduce((sum, job) => sum + (job.time_taken || 0), 0);
            const totalCost = techJobs.reduce((sum, job) => sum + (job.maintenance_cost || 0), 0);
            csv += `"${tech.full_name}",${techJobs.length},${totalTime},${totalCost}\n`;
          });
        }
        triggerDownload(`Technician_Performance_${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);

      } else if (reportId === 4) {
        // Alerts
        const { data, error } = await supabase.from('alerts').select('*, assets(name)');
        if (error) throw error;
        
        let csv = 'Alert ID,Asset,Issue,Priority,Status,Created At,Resolved At\n';
        data.forEach(row => {
          csv += `${row.id},"${row.assets?.name || ''}","${row.issue}",${row.priority},${row.status},${row.created_at},${row.resolved_at || ''}\n`;
        });
        triggerDownload(`Alerts_Log_${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);
      }
    } catch (err) {
      console.error("Error downloading report:", err);
      alert("Failed to download report.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and export system reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(report => (
          <div key={report.id} className="bg-card rounded-xl border border-border shadow-sm p-6 hover:border-primary/50 transition-colors group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <report.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{report.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {report.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 mb-6">
              {report.description}
            </p>
            <div className="flex justify-end border-t border-border pt-4">
              <button 
                onClick={() => handleDownload(report.id)}
                disabled={downloading === report.id}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloading === report.id ? 'Downloading...' : 'Download Report'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
