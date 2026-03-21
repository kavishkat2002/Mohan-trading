import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Loader2 } from "lucide-react";

const sourceColors: Record<string, string> = {
  whatsapp: "#10B981",
  facebook: "#2563EB",
  instagram: "#EC4899",
  tiktok: "#0F172A",
  web: "#1570EF",
  manual: "#6B7280"
};

const sourceLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  web: "Website",
  manual: "Manual"
};

export default function Analytics() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5001/api/leads")
      .then(res => res.json())
      .then(data => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Process data for charts
  const processData = () => {
    // 1. Source Data
    const sourceCounts = leads.reduce((acc, lead) => {
      const src = lead.source || 'manual';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceData = Object.entries(sourceCounts)
      .map(([src, count]) => ({
        name: sourceLabels[src] || src,
        value: count,
        fill: sourceColors[src] || "#D1D5DB"
      }))
      .sort((a, b) => b.value - a.value); // Sort by highest count

    // 2. Timeline Data (Last 7 Days)
    const timelineData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayLeads = leads.filter(l => l.created_at?.startsWith(dateStr));
      const closed = dayLeads.filter(l => l.status?.toLowerCase() === 'closed deal').length;
      
      timelineData.push({
        name: dayName,
        leads: dayLeads.length,
        closed: closed
      });
    }

    return { sourceData, timelineData };
  };

  const { sourceData, timelineData } = processData();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Deep dive into your sales performance and lead sources.</p>
      </div>

      {leads.length === 0 ? (
        <div className="border border-border rounded-lg bg-white p-16 text-center">
          <p className="text-sm text-muted-foreground">No leads data available yet. Please add leads to see analytics.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-full lg:col-span-2 border border-border rounded-lg bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Lead Generation (Past 7 Days)</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Incoming leads vs deals closed this week</p>
            </div>
            <div className="p-5 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1570EF" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#1570EF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 11}} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '8px', 
                      border: '1px solid #E5E7EB', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="#1570EF" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" name="Total Leads" />
                  <Area type="monotone" dataKey="closed" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorClosed)" name="Closed Deals" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Lead Sources</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Where your leads come from</p>
            </div>
            <div className="p-5 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fill: '#374151', fontSize: 11, fontWeight: 500}} />
                  <Tooltip 
                    cursor={{fill: '#F9FAFB'}}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
