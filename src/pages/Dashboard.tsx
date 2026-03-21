import { useEffect, useState } from "react";
import { Car, Users, Target, TrendingUp, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
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
    { label: "Total Leads", value: stats.leads, icon: Users, accent: "border-l-primary" },
    { label: "New This Week", value: stats.new, icon: TrendingUp, accent: "border-l-amber-400" },
    { label: "Closed Deals", value: stats.closed, icon: Target, accent: "border-l-emerald-500" },
  ];

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
          Overview
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your dealership at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className={`bg-white border border-border rounded-lg p-5 border-l-[3px] ${card.accent} hover:shadow-sm transition-all duration-200`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
              <card.icon className="h-4 w-4 text-primary/40" />
            </div>
            <div className="text-3xl font-semibold text-foreground tabular-nums font-sans tracking-tight">
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick summary section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-border rounded-lg p-6 bg-white">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { text: "New lead captured via WhatsApp", time: "2 min ago", dot: "bg-primary" },
              { text: "Test drive scheduled — Toyota Prius", time: "1 hour ago", dot: "bg-amber-400" },
              { text: "Deal closed — Honda Civic", time: "3 hours ago", dot: "bg-emerald-500" },
              { text: "Follow-up reminder sent", time: "Yesterday", dot: "bg-violet-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                <div className={`h-2 w-2 rounded-full ${item.dot} shrink-0`} />
                <span className="text-sm text-foreground/80 flex-1">{item.text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-lg p-6 bg-white">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Vehicle", icon: Car },
              { label: "New Lead", icon: Users },
              { label: "Open Chat", icon: MessageSquare },
              ...(user?.role === 'owner' ? [{ label: "Analytics", icon: Target }] : []),
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-3 p-3.5 rounded-lg border border-border text-sm font-medium text-foreground/70 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-200 group"
              >
                <action.icon className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
