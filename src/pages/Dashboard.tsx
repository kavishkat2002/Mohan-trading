import { useEffect, useState } from "react";
import { Car, Users, Target, TrendingUp, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ leads: 0, new: 0, closed: 0 });
  const [notices, setNotices] = useState<any[]>([]);

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

    fetch("http://localhost:5001/api/notices")
      .then(res => res.json())
      .then(data => setNotices(Array.isArray(data) ? data.slice(0, 5) : []))
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

      {/* Noticeboard Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="font-display text-xl font-bold text-foreground">Noticeboard</h2>
            <p className="text-xs text-muted-foreground">Company-wide announcements</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard/noticeboard")} className="text-xs font-semibold text-primary gap-1 h-8 px-3">
            View All →
          </Button>
        </div>

        {notices.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center bg-muted/20">
            <div className="py-2" />
            <p className="text-sm text-muted-foreground">No notices posted yet.</p>
            {(user?.role === "owner" || user?.role === "admin") && (
              <Button variant="outline" size="sm" className="mt-3 border-2 text-xs font-bold" onClick={() => navigate("/dashboard/noticeboard")}>
                Post First Notice
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative border-2 rounded-2xl bg-white overflow-hidden cursor-pointer hover:shadow-md transition-all group ${n.pinned ? "border-amber-300" : "border-border"}`}
                onClick={() => navigate("/dashboard/noticeboard")}
              >
                {n.pinned && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {n.pinned && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5">
                        📌 Pinned
                      </Badge>
                    )}
                    <h3 className="text-base font-bold text-foreground">{n.title}</h3>
                  </div>
                  <div
                    className="text-sm text-foreground/70 line-clamp-3 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: n.content }}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground font-medium">{n.author_name || "Admin"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
