import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const data = [
  { name: 'Mon', leads: 4, closed: 1 },
  { name: 'Tue', leads: 7, closed: 2 },
  { name: 'Wed', leads: 5, closed: 1 },
  { name: 'Thu', leads: 11, closed: 4 },
  { name: 'Fri', leads: 8, closed: 3 },
  { name: 'Sat', leads: 14, closed: 6 },
  { name: 'Sun', leads: 9, closed: 2 },
];

const sourceData = [
  { name: "WhatsApp Bot", value: 65, fill: "#1570EF" },
  { name: "Website", value: 25, fill: "#7C3AED" },
  { name: "Referral", value: 10, fill: "#D1D5DB" }
];

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Deep dive into your sales performance and lead sources.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full lg:col-span-2 border border-border rounded-lg bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Lead Generation over Time</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Incoming leads vs deals closed this week</p>
          </div>
          <div className="p-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 11}} />
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
    </div>
  );
}
