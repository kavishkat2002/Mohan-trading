import { useEffect, useState } from "react";
import { 
  Car, Users, Target, TrendingUp, Bell, DollarSign, Award, Trophy,
  ClipboardList, CheckCircle2, AlertCircle, Clock, Calendar, ArrowRight,
  ShieldCheck, UserCheck, Kanban, ArrowUpRight, CalendarDays, LogIn, XCircle,
  HelpCircle, BookOpen, MessagesSquare, Settings, MailOpen
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const CarPassengersIcon = ({ className }: { className?: string }) => (
  <div 
    className={cn("bg-current shrink-0", className)} 
    style={{
      maskImage: 'url(/car-passengers.png)',
      WebkitMaskImage: 'url(/car-passengers.png)',
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
    }}
  />
);

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  // State Management
  const [timeRange, setTimeRange] = useState<'7days' | 'month'>('7days');
  const [localUserId, setLocalUserId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [staffAttendanceList, setStaffAttendanceList] = useState<any[]>([]);
  const [commissionTotal, setCommissionTotal] = useState<number>(0);
  const [myAttendance, setMyAttendance] = useState<any>(null);
  const [messageStats, setMessageStats] = useState({ totalMessages: 0, chatSessions: 0 });

  // Date and Timezone helper
  const getLocalDateString = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString(new Date());

  // Closed status helper (supports 'Closed', 'Closed Deal', and 'Sale Completed')
  const isClosedStatus = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'closed' || s === 'closed deal' || s === 'sale completed';
  };

  const fetchDashboardData = async (silent = false) => {
    if (!user?.email) return;

    try {
      if (!silent) setLoading(true);

      // 1. Sync User to get Local database ID
      const syncRes = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/users/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email.toLowerCase(),
          role: user.role,
          name: user.email.split('@')[0],
          supabase_uid: String(user.id)
        })
      });
      const localUserData = await syncRes.json();
      const localId = localUserData.id;
      if (!localId) throw new Error("Could not sync local user ID");
      setLocalUserId(localId);

      // If the DB role differs from cached role, correct it immediately (handles accidental role changes)
      if (localUserData.role && localUserData.role !== user?.role) {
        updateUser({ role: localUserData.role });
        // Reload to apply the corrected role to all derived state
        window.location.reload();
        return;
      }

      // Fetch latest profile details to get updated custom profile name
      try {
        const profileRes = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/users/${localId}/profile`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setDisplayName(profileData.name || profileData.email.split('@')[0]);
        } else {
          setDisplayName(localUserData.name || localUserData.email.split('@')[0]);
        }
      } catch (e) {
        setDisplayName(localUserData.name || localUserData.email.split('@')[0]);
      }

      // 2. Fetch Notices (Both roles)
      const noticeRes = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/notices`);
      const noticeData = noticeRes.ok ? await noticeRes.json() : [];
      setNotices(Array.isArray(noticeData) ? noticeData.slice(0, 5) : []);

      // 3. Fetch data dynamically based on roles
      if (user?.role === 'owner' || user?.role === 'admin') {
        // Owner / Admin fetches
        const [leadsRes, vehiclesRes, attendanceRes, tasksRes, usersRes, salesRes, attSummaryRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/vehicles`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/attendance/all`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/tasks?userId=${localId}&role=${user.role}`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/users`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/finance/sales`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/attendance/dashboard-summary`)
        ]);

        setLeads(leadsRes.ok ? await leadsRes.json() : []);
        setVehicles(vehiclesRes.ok ? await vehiclesRes.json() : []);
        setAttendance(attendanceRes.ok ? await attendanceRes.json() : []);
        setTasks(tasksRes.ok ? await tasksRes.json() : []);
        setUsers(usersRes.ok ? await usersRes.json() : []);
        setSales(salesRes.ok ? await salesRes.json() : []);
        setStaffAttendanceList(attSummaryRes.ok ? await attSummaryRes.json() : []);
      } else {
        // Employee / Accountant fetches
        const [leadsRes, tasksRes, commRes, attRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/tasks?userId=${localId}&role=${user.role}`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/users/${localId}/commissions`),
          fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/attendance/status/${localId}`)
        ]);

        setLeads(leadsRes.ok ? await leadsRes.json() : []);
        setTasks(tasksRes.ok ? await tasksRes.json() : []);
        
        const commData = commRes.ok ? await commRes.json() : { total: 0 };
        setCommissionTotal(commData.total || 0);

        const attData = attRes.ok ? await attRes.json() : null;
        setMyAttendance(attData);
      }

      // Fetch general message statistics for both roles
      try {
        const statsRes = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/messages/stats`);
        if (statsRes.ok) {
          setMessageStats(await statsRes.json());
        }
      } catch (e) {
        console.error("Failed to fetch message stats", e);
      }

      setLoading(false);
    } catch (err) {
      console.error("Dashboard Loading Error:", err);
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 15000);
    return () => clearInterval(interval);
  }, [user?.email]);

  // OWNER/ADMIN DATA COMPUTATIONS
  const closedLeads = leads.filter(l => isClosedStatus(l.status));
  
  // Total Sales Volume: sum of selling_price from recorded sales, or fallback to budget of closed leads if sales is empty
  const revenueTotal = sales.length > 0 
    ? sales.reduce((sum, s) => sum + (parseFloat(s.selling_price) || 0), 0)
    : closedLeads.reduce((sum, l) => {
        const budgetStr = l.budget || "0";
        return sum + (parseInt(budgetStr.replace(/[^0-9]/g, ''), 10) || 0);
      }, 0);

  const commissionPayout = closedLeads.reduce((sum, l) => sum + (parseFloat(l.commission_amount) || 0), 0);
  
  const todayCheckedInCount = attendance.filter(a => {
    try {
      const recDate = getLocalDateString(a.date);
      return recDate === todayStr && a.check_in_time;
    } catch (e) { return false; }
  }).length;

  const activeLeadsCount = leads.filter(l => !isClosedStatus(l.status)).length;
  const inStockVehiclesCount = vehicles.reduce((sum, v) => sum + (v.stock || 0), 0);

  // Employee Performance breakdown for Owner/Admin
  const salespersonList = users
    .filter(u => u.role !== 'owner' && u.role !== 'admin')
    .map(u => {
      const myUserLeads = leads.filter(l => l.assigned_to === u.id);
      const myUserClosedLeads = myUserLeads.filter(l => isClosedStatus(l.status));
      const closedCount = myUserClosedLeads.length;
      const totalEarnedCommission = myUserClosedLeads.reduce((sum, l) => sum + (parseFloat(l.commission_amount) || 0), 0);

      return {
        ...u,
        closedCount,
        totalEarnedCommission
      };
    })
    .sort((a, b) => b.closedCount - a.closedCount || b.totalEarnedCommission - a.totalEarnedCommission);

  // Attendance & Leave Stats: now sourced directly from the backend dashboard-summary endpoint
  // (avoids UUID vs integer user_id mismatch)
  const pendingLeavesTotal = staffAttendanceList.reduce((sum, s) => sum + (s.pendingLeavesCount || 0), 0);

  // EMPLOYEE DATA COMPUTATIONS
  const myAssignedLeads = leads.filter(l => l.assigned_to === localUserId);
  const myActiveLeads = myAssignedLeads.filter(l => !isClosedStatus(l.status));
  // Process timeline data for leads count
  const getTimelineData = () => {
    const dataPoints = timeRange === '7days' ? 7 : 30;
    const timeline = [];
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      
      let label = "";
      if (timeRange === '7days') {
        label = d.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }
      
      const dayLeads = leads.filter(l => {
        try {
          return getLocalDateString(l.created_at) === dateStr;
        } catch (e) {
          return false;
        }
      });
      
      timeline.push({
        name: label,
        leads: dayLeads.length
      });
    }
    return timeline;
  };

  const chartData = getTimelineData();

  // Render Loading
  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <TrendingUp className="h-8 w-8 animate-pulse text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Crunching dashboard statistics...</span>
        </div>
      </div>
    );
  }

  // Greeting Message
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-8">
      
      {/* 1. Header Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
            {getGreeting()}, {displayName || user?.email.split('@')[0]}!
          </h1>
          <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
            {isAdmin 
              ? "Here is the operational efficiency and financial health of Mohan Traders today."
              : "Manage your assigned clients, track active operations, and view notifications."}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm self-start md:self-center shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <div className="text-left">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Today's Date</p>
            <p className="text-xs font-semibold text-slate-700 mt-1 leading-none">
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column (Wider): Statistics, Trend Chart, and Tables */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* A. STATISTICS BOX */}
          <Card className="rounded-2xl border border-slate-150/60 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Statistics</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-4 bg-[#F8F9FD] border border-slate-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <MessagesSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 leading-none mb-1.5">Chat Sessions</p>
                  <p className="text-lg font-extrabold text-slate-900 leading-none">{(12500 + messageStats.chatSessions).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-[#F8F9FD] border border-slate-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 leading-none mb-1.5">Total Users</p>
                  <p className="text-lg font-extrabold text-slate-900 leading-none">{(11400 + leads.length).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-[#F8F9FD] border border-slate-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                  <MailOpen className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 leading-none mb-1.5">Total Messages</p>
                  <p className="text-lg font-extrabold text-slate-900 leading-none">{(26200 + messageStats.totalMessages).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-[#F8F9FD] border border-slate-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 leading-none mb-1.5">Avg. Session Time</p>
                  <p className="text-lg font-extrabold text-slate-900 leading-none">1h 30 min</p>
                </div>
              </div>
            </div>
          </Card>

          {/* B. TREND CHART */}
          <Card className="rounded-2xl border border-slate-150/60 bg-white p-6 shadow-sm">
            <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-650 text-indigo-600" /> Trend of Leads
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">Visualizing new buyer enquiries over time</CardDescription>
              </div>
              <div className="flex bg-slate-100/80 border border-slate-200/50 p-1 rounded-xl gap-1 shrink-0 text-xs">
                <button 
                  onClick={() => setTimeRange('7days')} 
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeRange === '7days' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Last 7 Days
                </button>
                <button 
                  onClick={() => setTimeRange('month')} 
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${timeRange === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Month
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[280px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px' }}
                      itemStyle={{ color: '#6366f1', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Dealership Inventory overview (for all roles) */}
          <Card className="rounded-2xl border border-slate-150/60 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 pb-4 bg-transparent border-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100/50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                      <CarPassengersIcon className="h-4 w-4" />
                    </div>
                    Dealership Inventory
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">Quick review of vehicles stock counts.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/vehicles")} className="text-xs h-8 border-slate-200 hover:border-slate-350 text-slate-600 font-semibold gap-1 rounded-lg shrink-0">
                  Inventory Page <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/50">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 px-6">Brand & Model</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Selling Price</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Category</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-right px-6">In Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100/50">
                  {vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                        No vehicle records in database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.slice(0, 4).map((veh) => (
                      <TableRow key={`veh-${veh.id}`} className="hover:bg-slate-50/20 transition-colors border-none">
                        <TableCell className="py-3 px-6 font-bold text-sm text-slate-850 text-slate-800">
                          {veh.brand}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-xs font-semibold text-slate-700">
                          LKR {parseFloat(veh.price).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200/50 rounded-md px-2 py-0.5 font-medium">
                            {veh.category || 'Standard'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right px-6">
                          <Badge className={
                            veh.stock > 1 
                              ? "bg-slate-50 text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold px-2 py-0.5 text-[10px]"
                              : "bg-[#FFF0F3] text-[#FC003F] hover:bg-[#FFF0F3] border border-[#FFCCD5] font-bold px-2 py-0.5 text-[10px]"
                          }>
                            {veh.stock > 1 ? `${veh.stock} units` : `${veh.stock} Unit Left`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Sidebar): Quick Links, Notices Feed, and Help Docs */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 1. Quick Links Card */}
          <Card className="rounded-2xl border border-slate-150/60 bg-white p-6 shadow-sm">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-sm font-bold text-slate-850 text-slate-800">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {[
                { label: "Vehicles Catalog", desc: "Manage vehicle catalog and prices.", path: "/dashboard/vehicles", icon: CarPassengersIcon },
                { label: "Client Leads", desc: "Manage customer inquiries and deals.", path: "/dashboard/leads", icon: Users },
                {label: "WhatsApp Inbox", desc: "View chats and train AI responder.", path: "/dashboard/chat", icon: MessagesSquare},
                { label: "CRM Settings", desc: "Configure business settings.", path: "/dashboard/settings", icon: Settings },
              ].map((item, idx) => (
                <div 
                  key={`ql-${idx}`}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 bg-[#F8F9FD] border border-slate-100/50 hover:bg-violet-50/50 hover:border-violet-100/50 rounded-xl p-3 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow"
                >
                  <div className="h-8 w-8 rounded-lg bg-violet-50 border border-violet-100/50 text-violet-600 flex items-center justify-center shrink-0 group-hover:bg-violet-100/80 transition-colors">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-violet-700 transition-colors leading-none mb-1">{item.label}</p>
                    <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>



          {/* 3. Help & Documentation Card */}
          <div 
            onClick={() => navigate("/dashboard/settings")}
            className="bg-violet-50/60 border border-violet-100 rounded-2xl p-4 flex gap-3 items-start cursor-pointer hover:bg-violet-50/90 transition-colors shadow-sm"
          >
            <div className="h-8 w-8 rounded-lg bg-violet-100 border border-violet-200/50 text-violet-600 flex items-center justify-center shrink-0">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 mb-1 leading-none">Help & Documentation</p>
              <p className="text-[10px] text-slate-500 leading-normal">
                Click to view configuration guides or contact support for help managing Mohan Traders CRM.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
