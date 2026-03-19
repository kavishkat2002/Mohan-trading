import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, BookOpen, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, new: 0, closed: 0 });

  useEffect(() => {
    fetch("http://localhost:5001/api/leads")
      .then(res => res.json())
      .then(data => {
        setStats({
          leads: data.length,
          new: data.filter((l: any) => l.status === "New").length,
          closed: data.filter((l: any) => l.status === "Closed Deal").length,
        });
      })
      .catch(console.error);
  }, []);

  const cards = [
    { label: "Total Leads", icon: Users, value: stats.leads, color: "text-blue-500" },
    { label: "New Leads", icon: MessageSquare, value: stats.new, color: "text-amber-500" },
    { label: "Closed Deals", icon: Target, value: stats.closed, color: "text-emerald-500" },
    { label: "Active Pipelines", icon: BookOpen, value: stats.leads - stats.new - stats.closed, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 mt-1">Snapshot of your CRM performance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:shadow-md transition-all duration-300 border-slate-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{card.label}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
