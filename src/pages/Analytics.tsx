import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

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
  { name: "WhatsApp Bot", value: 65, fill: "#22c55e" },
  { name: "Website", value: 25, fill: "#3b82f6" },
  { name: "Referral", value: 10, fill: "#a855f7" }
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
        <p className="text-slate-500 mt-1">Deep dive into your sales performance and lead sources.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Lead Generation over Time</CardTitle>
            <CardDescription>Number of incoming leads vs deals closed in the past week.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" name="Total Leads" />
                <Area type="monotone" dataKey="closed" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorClosed)" name="Closed Deals" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Where your leads are coming from.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fill: '#475569', fontSize: 13, fontWeight: 500}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {sourceData.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
