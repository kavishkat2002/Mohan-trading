import { useEffect, useState } from "react";
import { 
  Car, Users, Target, TrendingUp, Bell, DollarSign, Award, Trophy,
  ClipboardList, CheckCircle2, AlertCircle, Clock, Calendar, ArrowRight,
  ShieldCheck, UserCheck, Kanban, ArrowUpRight, CalendarDays, LogIn, XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  // State Management
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
      const syncRes = await fetch("http://localhost:5001/api/users/sync", {
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
        const profileRes = await fetch(`http://localhost:5001/api/users/${localId}/profile`);
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
      const noticeRes = await fetch("http://localhost:5001/api/notices");
      const noticeData = noticeRes.ok ? await noticeRes.json() : [];
      setNotices(Array.isArray(noticeData) ? noticeData.slice(0, 5) : []);

      // 3. Fetch data dynamically based on roles
      if (user?.role === 'owner' || user?.role === 'admin') {
        // Owner / Admin fetches
        const [leadsRes, vehiclesRes, attendanceRes, tasksRes, usersRes, salesRes, attSummaryRes] = await Promise.all([
          fetch("http://localhost:5001/api/leads"),
          fetch("http://localhost:5001/api/vehicles"),
          fetch("http://localhost:5001/api/attendance/all"),
          fetch(`http://localhost:5001/api/tasks?userId=${localId}&role=${user.role}`),
          fetch("http://localhost:5001/api/users"),
          fetch("http://localhost:5001/api/finance/sales"),
          fetch("http://localhost:5001/api/attendance/dashboard-summary")
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
          fetch("http://localhost:5001/api/leads"),
          fetch(`http://localhost:5001/api/tasks?userId=${localId}&role=${user.role}`),
          fetch(`http://localhost:5001/api/users/${localId}/commissions`),
          fetch(`http://localhost:5001/api/attendance/status/${localId}`)
        ]);

        setLeads(leadsRes.ok ? await leadsRes.json() : []);
        setTasks(tasksRes.ok ? await tasksRes.json() : []);
        
        const commData = commRes.ok ? await commRes.json() : { total: 0 };
        setCommissionTotal(commData.total || 0);

        const attData = attRes.ok ? await attRes.json() : null;
        setMyAttendance(attData);
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
  const myPendingTasksCount = tasks.filter(t => t.status !== 'Completed').length;

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
    <div className="space-y-10 animate-in fade-in duration-500">
      
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

      {/* 2. STATS CARDS SECTION */}
      {isAdmin ? (
        /* =================== OWNER / ADMIN ACCESS VIEW =================== */
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sales Volume</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">LKR {revenueTotal.toLocaleString()}</h3>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commissions Paid</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">LKR {commissionPayout.toLocaleString()}</h3>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active CRM Leads</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                {activeLeadsCount} <span className="text-sm font-normal text-slate-450 text-slate-400">/ {leads.length} total</span>
              </h3>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Staff Today</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                {todayCheckedInCount} <span className="text-sm font-normal text-slate-400">on site</span>
              </h3>
            </div>
          </motion.div>
        </div>
      ) : (
        /* =================== SALES / EMPLOYEE ACCESS VIEW =================== */
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Commissions (Month)</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Trophy className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">LKR {commissionTotal.toLocaleString()}</h3>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Active Clients</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                {myActiveLeads.length} <span className="text-sm font-normal text-slate-400">/ {myAssignedLeads.length} total</span>
              </h3>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Actions & Tasks</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                {myPendingTasksCount} <span className="text-sm font-normal text-slate-400">Pending</span>
              </h3>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Work Attendance</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                {myAttendance ? (myAttendance.check_out_time ? "Finished" : "Checked In") : "Absent"}
              </h3>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. DYNAMIC CONTENT GRID */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        
        {/* Left Column: Role specific statistics summaries */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin ? (
            /* ================= OWNER SPECIFIC: ATTENDANCE & LEAVE TABLE ================= */
            <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-6 pb-4 bg-transparent border-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                      <CalendarDays className="h-5 w-5 text-primary" /> Attendance & Leave Requests
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Today's staff check-in status and pending leave requests.
                      {pendingLeavesTotal > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0 text-[10px] font-bold">
                          <Clock className="h-2.5 w-2.5" /> {pendingLeavesTotal} pending
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/attendance")} className="text-xs h-8 border-slate-200 hover:border-slate-350 text-slate-600 font-semibold gap-1 rounded-lg shrink-0">
                    Attendance Page <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/50">
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 px-6">Employee</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Role</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Today's Status</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-center">Check-In Time</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-right px-6">Leave Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100/50">
                    {staffAttendanceList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                          No staff registered in the system.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffAttendanceList.map((staffMember) => {
                        const name = staffMember.name || staffMember.email.split('@')[0];
                        const initials = name.slice(0, 2).toUpperCase();
                        const rec = staffMember.todayRecord;
                        const checkedIn = !!rec?.check_in_time;
                        const checkedOut = !!rec?.check_out_time;
                        const checkInTime = rec?.check_in_time 
                          ? new Date(rec.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : null;

                        return (
                          <TableRow key={`att-${staffMember.id}`} className="hover:bg-slate-50/20 transition-colors border-none cursor-pointer" onClick={() => navigate("/dashboard/attendance")}>
                            <TableCell className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-sm text-slate-800 leading-tight truncate">{name}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">{staffMember.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge className="bg-slate-50 text-slate-700 hover:bg-slate-50 border border-slate-200 uppercase text-[9px] tracking-wider font-bold px-2 py-0.5 rounded-md">
                                {staffMember.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              {checkedOut ? (
                                <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                  <CheckCircle2 className="h-3 w-3" /> Shift Done
                                </span>
                              ) : checkedIn ? (
                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                  On Site
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-[#FFF0F3] text-[#FC003F] border border-[#FFCCD5] rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                  <XCircle className="h-3 w-3" /> Absent
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              {checkInTime ? (
                                <span className="flex items-center justify-center gap-1 text-xs font-mono font-semibold text-slate-700">
                                  <LogIn className="h-3 w-3 text-slate-400" />{checkInTime}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300 font-mono">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-right px-6">
                              {staffMember.pendingLeavesCount > 0 ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                  <Clock className="h-3 w-3" /> {staffMember.pendingLeavesCount} Pending
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300 font-mono">None</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            /* ================= EMPLOYEE SPECIFIC: MY LEADS ================= */
            <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-6 pb-4 bg-transparent border-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                      <Kanban className="h-5 w-5 text-blue-600" /> My Assigned Leads
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">Leads assigned to you that require customer relationship management.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/leads")} className="text-xs h-8 border-slate-200 hover:border-slate-350 text-slate-600 font-semibold gap-1 rounded-lg shrink-0">
                    All Leads <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/50">
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 px-6">Customer Name</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Interested Vehicle</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3">Target Budget</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 text-right px-6">Lead Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100/50">
                    {myAssignedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs">
                          No leads currently assigned to your profile.
                        </TableCell>
                      </TableRow>
                    ) : (
                      myAssignedLeads.slice(0, 5).map((l) => (
                        <TableRow key={`lead-${l.id}`} className="hover:bg-slate-50/20 transition-colors cursor-pointer border-none" onClick={() => navigate("/dashboard/leads")}>
                          <TableCell className="py-4 px-6">
                            <div className="font-semibold text-sm text-slate-800 leading-tight">{l.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{l.phone}</div>
                          </TableCell>
                          <TableCell className="py-4 text-xs font-semibold text-slate-600">
                            {l.interested_product || l.interested_car || "General Enquiry"}
                          </TableCell>
                          <TableCell className="py-4 font-mono text-xs font-semibold text-slate-700">
                            {l.budget || "N/A"}
                          </TableCell>
                          <TableCell className="py-4 text-right px-6">
                            <Badge className={
                              isClosedStatus(l.status) ? "bg-green-50 text-green-700 hover:bg-green-50 border border-green-100/60 font-bold px-2 py-0.5 text-[10px]" : 
                              l.status === 'New' ? "bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100/60 font-bold px-2 py-0.5 text-[10px]" : 
                              "bg-orange-50 text-orange-700 hover:bg-orange-50 border border-orange-100/60 font-bold px-2 py-0.5 text-[10px]"
                            }>
                              {l.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Additional details for Owner or Employee: Mini Inventory list or my Tasks list */}
          {isAdmin ? (
            /* Mini Inventory overview for Owner */
            <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-6 pb-4 bg-transparent border-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <img src="/red-car-icon.png" alt="Inventory" className="h-8 w-8 object-contain" /> Dealership Inventory
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
          ) : (
            /* Tasks Feed for Employee */
            <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-6 pb-4 bg-transparent border-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <ClipboardList className="h-4.5 w-4.5 text-amber-500" /> My Assigned Tasks
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">Operations assigned to your user account.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/tasks")} className="text-xs h-8 border-slate-200 hover:border-slate-350 text-slate-600 font-semibold gap-1 rounded-lg shrink-0">
                    Tasks Page <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2 text-xs">
                    <CheckCircle2 className="h-6 w-6 mx-auto opacity-30 text-green-500" />
                    <p>All clean! No tasks currently assigned.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100/50">
                    {tasks.slice(0, 4).map((task) => (
                      <div key={`task-${task.id}`} className="p-4 flex items-center justify-between hover:bg-slate-50/20 transition-colors">
                        <div className="space-y-1 min-w-0 flex-1 pr-4">
                          <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span className="font-semibold text-slate-500">Priority: {task.priority}</span>
                          </div>
                        </div>
                        <Badge className={
                          task.status === 'Completed' ? "bg-green-50 text-green-700 hover:bg-green-50 border border-green-100 font-bold text-[10px] px-2 py-0.5 rounded-md" :
                          task.status === 'In Progress' ? "bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 font-bold text-[10px] px-2 py-0.5 rounded-md" : 
                          "bg-slate-50 text-slate-600 hover:bg-slate-50 border border-slate-200 font-bold text-[10px] px-2 py-0.5 rounded-md"
                        }>
                          {task.status === 'Completed' ? 'Done' : task.status === 'In Progress' ? 'Doing' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Noticeboard Announcements Feed */}
        <div>
          <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden bg-white h-full flex flex-col">
            <CardHeader className="p-6 pb-4 bg-transparent border-none flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Bell className="h-5 w-5 text-primary" /> Announcement Feed
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">Company-wide updates & notices</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/noticeboard")} className="text-xs h-8 text-primary hover:text-primary/80 font-bold px-2 rounded-lg shrink-0">
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-6 pt-0 flex-1 overflow-y-auto max-h-[500px] scrollbar-minimal">
              {notices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Bell className="h-8 w-8 mx-auto opacity-30" />
                  <p className="text-xs">No notices posted yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notices.map((n, i) => (
                    <motion.div
                      key={`notice-${n.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-4 rounded-xl border relative transition-all group flex flex-col justify-between hover:shadow-sm hover:-translate-y-0.5 duration-200 ${
                        n.pinned 
                          ? "border-l-4 border-l-amber-500 border-t border-r border-b border-slate-100 bg-amber-50/15" 
                          : "border-l-4 border-l-slate-300 border-t border-r border-b border-slate-100 bg-slate-50/30"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          {n.pinned && (
                            <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-none text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                              Pinned
                            </Badge>
                          )}
                          <h4 className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors line-clamp-1 leading-tight">{n.title}</h4>
                        </div>
                        <div
                          className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3"
                          dangerouslySetInnerHTML={{ __html: n.content }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100/50 pt-2 shrink-0">
                        <span className="font-semibold text-slate-500">{n.author_name || "Admin"}</span>
                        <span>{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
