import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, MessageSquare, ListTodo,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Car, Menu, X, Shield, CalendarClock, Banknote, Bell, ClipboardList,
  AlertTriangle, CreditCard, Phone, CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Vehicles", icon: Car, path: "/dashboard/vehicles" },
  { label: "Leads", icon: Users, path: "/dashboard/leads" },
  { label: "Noticeboard", icon: Bell, path: "/dashboard/noticeboard" },
  { label: "Chat Box", icon: MessageSquare, path: "/dashboard/chat" },
  { label: "Tasks", icon: ClipboardList, path: "/dashboard/tasks" },
  { label: "Attendance", icon: CalendarClock, path: "/dashboard/attendance" },
  { label: "Finance", icon: Banknote, path: "/dashboard/finance" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { business } = useBusiness();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const isElevated = user?.role === 'owner' || user?.role === 'admin';
  const filteredNavItems = navItems.filter(item => {
    if (item.label === "Noticeboard") return false;
    if (isElevated) return true;
    if (user?.role === 'accountant') {
      return ["Dashboard", "Vehicles", "Leads", "Tasks", "Attendance", "Finance"].includes(item.label);
    }
    return ["Dashboard", "Vehicles", "Leads", "Tasks", "Attendance"].includes(item.label);
  });

  const [commissionTotal, setCommissionTotal] = useState<number>(0);
  const [companyStats, setCompanyStats] = useState<{ revenue: number, payout: number } | null>(null);
  const [localUserId, setLocalUserId] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const toastedIdsRef = useRef<number[]>([]);

  useEffect(() => {
    const checkSubscription = () => {
      fetch("http://localhost:5001/api/subscription")
        .then(res => res.json())
        .then(data => setSubscription(data))
        .catch(() => setSubscription(null));
    };

    checkSubscription(); // Fetch immediately on mount
    const interval = setInterval(checkSubscription, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const isAccountBlocked = subscription && (
    subscription.status === 'Suspended' ||
    new Date(subscription.expires_at) < new Date()
  );
  const daysLeft = subscription
    ? Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  useEffect(() => {
    if (!user?.email) return;

    // First, sync the user to get their local database ID
    fetch("http://localhost:5001/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email.toLowerCase(),
        role: user.role,
        name: user.email.split('@')[0]
      })
    })
      .then(res => res.json())
      .then(localUser => {
        const localId = localUser.id;
        if (!localId) return;
        setLocalUserId(localId);

        // Fetch Commissions if Sales Person
        if (!isElevated) {
          fetch(`http://localhost:5001/api/users/${localId}/commissions`)
            .then(res => res.json())
            .then(data => setCommissionTotal(data.total))
            .catch(console.error);
        }
      })
      .catch(console.error);

    // Fetch Company Stats for Owner & Accountant (Independent of localId)
    if (user?.role === 'owner' || user?.role === 'accountant') {
      fetch("http://localhost:5001/api/leads")
        .then(res => res.json())
        .then(data => {
          const closed = data.filter((l: any) => l.status === 'Closed');
          let rev = 0;
          let pay = 0;
          closed.forEach((l: any) => {
            const budgetStr = l.budget || "0";
            rev += parseInt(budgetStr.replace(/[^0-9]/g, ''), 10) || 0;
            pay += parseFloat(l.commission_amount) || 0;
          });
          setCompanyStats({ revenue: rev, payout: pay });
        })
        .catch(console.error);
    }
  }, [user, isElevated]);

  // Polling for real-time notifications
  useEffect(() => {
    if (!localUserId) return;

    const fetchNotifications = () => {
      fetch(`http://localhost:5001/api/users/${localUserId}/notifications`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Find notifications we haven't toasted yet
            const newNotifs = data.filter(n => !toastedIdsRef.current.includes(n.id));
            if (newNotifs.length > 0) {
              newNotifs.forEach(n => {
                let title = "Notification 🔔";
                
                if (n.message.includes("Completed")) {
                  title = "Task Completed ✅";
                } else if (n.message.includes("In Progress")) {
                  title = "Task in Progress ⚡";
                } else if (n.message.includes("assigned")) {
                  title = "New Task Assigned 📋";
                }

                toast({
                  title,
                  description: n.message,
                });
              });
              
              // Store toasted IDs to prevent repeats
              toastedIdsRef.current = [...toastedIdsRef.current, ...newNotifs.map(n => n.id)];
            }
            
            // Set unread notifications
            setNotifications(data);
          }
        })
        .catch(console.error);
    };

    fetchNotifications(); // Fetch immediately
    const interval = setInterval(fetchNotifications, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [localUserId, toast]);

  const handleMarkAsRead = async (notifId: number) => {
    try {
      const res = await fetch(`http://localhost:5001/api/users/notifications/${notifId}/read`, {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!localUserId) return;
    try {
      const res = await fetch(`http://localhost:5001/api/users/${localUserId}/notifications/read-all`, {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/auth");
  };

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[260px]";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo area with MohanTrader branding */}
      <div className={cn(
        "flex items-center gap-3 px-5 py-5",
        collapsed && "justify-center px-3"
      )}>
        <img
          src={business?.logo_url || "/mohantrader-logo.png"}
          alt={business?.name || "MohanTrader"}
          className="h-10 w-10 rounded-xl object-contain bg-white/10 p-1 shrink-0"
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <p className="text-[17px] font-semibold text-white leading-tight break-all">
                {business?.name || "Mohan Trader"}
              </p>
              <p className="text-[10px] text-white/40 tracking-wide italic leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {business?.slogan || "Delivering Dreams, Driving Trust"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {filteredNavItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative group",
                active
                  ? "bg-primary text-white"
                  : "text-sidebar-accent-foreground hover:text-white hover:bg-sidebar-accent",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "opacity-60 group-hover:opacity-100")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4">
        <div className="border-t border-sidebar-border pt-3">
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-accent-foreground hover:text-red-400 hover:bg-sidebar-accent w-full transition-all duration-200",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 opacity-60" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden print:overflow-visible print:h-auto print:block">
      {/* Desktop sidebar — dark navy */}
      {!isMobile && (
        <aside className={cn(
          "hidden md:flex flex-col bg-sidebar transition-all duration-300 relative z-20 print:hidden",
          sidebarWidth
        )}>
          <SidebarContent />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute top-7 -right-3 z-50 h-6 w-6 rounded-full bg-white border border-border flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3 w-3 text-gray-500" /> : <ChevronLeft className="h-3 w-3 text-gray-500" />}
          </button>
        </aside>
      )}

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="relative w-[260px] bg-sidebar z-50"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 p-1 rounded-md hover:bg-sidebar-accent transition-colors"
              >
                <X className="h-4 w-4 text-sidebar-accent-foreground" />
              </button>
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main content — clean white */}
      <main className="flex-1 flex flex-col overflow-hidden w-full relative print:overflow-visible print:block">
        <header className="h-14 border-b border-border flex items-center px-5 md:px-6 gap-3 bg-white shrink-0 z-10 sticky top-0 print:hidden">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="mr-1 h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h2 className="font-sans font-semibold text-sm tracking-tight text-foreground uppercase">
            {navItems.find(n => location.pathname.startsWith(n.path))?.label || "Dashboard"}
          </h2>
          <div className="ml-auto flex items-center gap-4">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="h-9 w-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer relative"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white animate-pulse leading-none">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setNotificationsOpen(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <span className="text-xs font-semibold text-slate-800">Notifications ({notifications.length})</span>
                        {notifications.length > 0 && (
                          <button 
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto scrollbar-minimal">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 space-y-2">
                            <Bell className="h-8 w-8 mx-auto opacity-30" />
                            <p className="text-xs">No unread notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {notifications.map((n) => {
                              const isCompleted = n.message.includes("Completed");
                              const isInProgress = n.message.includes("In Progress");
                              
                              return (
                                <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors flex gap-2.5 items-start">
                                  <div className={cn(
                                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                    isCompleted ? "bg-green-50 text-green-600" :
                                    isInProgress ? "bg-blue-50 text-blue-600" : "bg-primary/5 text-primary"
                                  )}>
                                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> :
                                     isInProgress ? <Clock className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-700 leading-normal break-words">{n.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleMarkAsRead(n.id)}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 shrink-0 font-medium self-center px-1.5 py-0.5 hover:bg-slate-100 rounded transition-colors"
                                  >
                                    Read
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-semibold text-foreground capitalize tracking-wide">{user?.role?.replace('_', ' ') || user?.role} Profile</p>
              <div className="flex flex-col items-end">
                <p className="text-[11px] text-muted-foreground">{profileName || user?.email}</p>
                {!isElevated && user?.role !== 'accountant' && commissionTotal > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Comm: LKR {commissionTotal}</p>
                )}

              </div>
            </div>
            <button
              onClick={() => setProfileOpen(true)}
              className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm hover:bg-primary/20 transition-all cursor-pointer overflow-hidden relative"
            >
              {profileAvatar ? (
                <img src={profileAvatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary uppercase">{(profileName || user?.email)?.charAt(0) || "U"}</span>
              )}
            </button>
          </div>
        </header>

        <ProfileSettingsDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          user={user}
          localUserId={localUserId}
          setProfileName={setProfileName}
          setProfileAvatar={setProfileAvatar}
        />

        <div className="flex-1 overflow-auto scrollbar-minimal flex flex-col">

          {/* ⚠️ Expiry warning banner — only for owner, only when ≤ 2 days left */}
          {user?.role === 'owner' && !isAccountBlocked && daysLeft !== null && daysLeft <= 2 && daysLeft > 0 && (
            <div className={`flex items-center justify-between gap-4 px-5 py-3 text-sm font-medium ${daysLeft === 1 ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
              <div className="flex items-center gap-2.5">
                <span>
                  {daysLeft === 1
                    ? '🚨 Your subscription expires TOMORROW! Renew now to avoid losing access.'
                    : `⚠️ Your subscription expires in ${daysLeft} days. Please renew soon to avoid interruption.`}
                </span>
              </div>
              <a
                href="https://wa.me/94762345336?text=Hi,%20I%20would%20like%20to%20renew%20my%20CRM%20subscription."
                target="_blank"
                rel="noreferrer"
                className={`shrink-0 text-xs font-bold underline underline-offset-2 hover:opacity-80 transition-opacity`}
              >
                Contact to Renew →
              </a>
            </div>
          )}

          <div className="flex-1 p-5 md:p-8">
            <div className="relative flex-1">
              {/* Blur overlay when suspended/expired */}
              {isAccountBlocked && (
                <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(15,23,42,0.55)' }}>
                  <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full mx-4 overflow-hidden">
                    {/* Red top bar */}
                    <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-600" />
                    <div className="p-8 text-center space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {subscription?.status === 'Suspended' ? 'Account Suspended' : 'Subscription Expired'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                          {subscription?.status === 'Suspended'
                            ? 'Your account has been temporarily suspended. Please contact support to restore access.'
                            : 'Your subscription plan has expired. Please renew your plan to continue using the CRM.'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">Plan</span>
                          <span className="text-slate-800 font-semibold">{subscription?.plan_type || 'Starter'} — $30/mo</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">Status</span>
                          <span className="text-red-600 font-semibold">{subscription?.status === 'Suspended' ? 'Suspended' : 'Expired'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">Expired on</span>
                          <span className="text-slate-700 font-mono text-xs">
                            {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2.5 pt-1">
                        <a
                          href="https://wa.me/94762345336?text=Hi,%20I%20would%20like%20to%20renew%20my%20CRM%20subscription."
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm shadow-sm shadow-emerald-200"
                        >
                          <Phone className="h-4 w-4" /> Contact on WhatsApp
                        </a>
                        <p className="text-[11px] text-slate-400">
                          Powered by <span className="font-semibold text-slate-500">Creativex Technology</span> · <a href="https://www.creativexlab.online/" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">creativexlab.online</a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex-1 ${isAccountBlocked ? 'pointer-events-none select-none' : ''}`}
              >
                {children}
              </motion.div>
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-4 border-t border-border text-center">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Design & Developed By © 2026 <a href="https://www.creativexlab.online/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground/70 hover:text-primary transition-colors">Creativex Technology</a> All Rights Reserved.
              </p>
            </footer>
          </div> {/* end footer wrapper */}
        </div>
      </main>
    </div>
  );
}

function ProfileSettingsDialog({ open, onOpenChange, user, localUserId, setProfileName, setProfileAvatar }: { open: boolean; onOpenChange: (open: boolean) => void; user: any; localUserId: number | null; setProfileName: (n: string) => void; setProfileAvatar: (a: string) => void; }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !localUserId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/users/${localUserId}/avatar`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.avatar_url);
        toast({ title: "Photo uploaded successfully" });
      } else {
        toast({ title: "Upload failed", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "An error occurred during upload", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && localUserId) {
      fetch(`http://localhost:5001/api/users/${localUserId}/profile`)
        .then(res => res.json())
        .then(data => {
          if (data.name) {
            setName(data.name);
            setProfileName(data.name);
          }
          if (data.mobile_number) setMobileNumber(data.mobile_number);
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
            setProfileAvatar(data.avatar_url);
          }
        })
        .catch(console.error);
    }
  }, [open, localUserId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localUserId) {
      toast({ title: "Profile Syncing", description: "Please wait a moment while your profile is synchronized.", variant: "destructive" });
      return;
    }
    if (newPassword && !oldPassword) {
      toast({ title: "Old Password required", description: "You must enter your old password to set a new one.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/users/${localUserId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobile_number: mobileNumber,
          avatar_url: avatarUrl,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Profile updated successfully" });
        setProfileName(name);
        setProfileAvatar(avatarUrl);
        setOldPassword("");
        setNewPassword("");
        onOpenChange(false);
      } else {
        toast({ title: "Update failed", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-11/12 rounded-lg">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={user?.email || ""} readOnly disabled className="bg-gray-50 text-gray-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Type your full name" />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="e.g. +1 234 567 890" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Profile Picture (Upload from device)</Label>
            <div className="flex gap-3 items-center">
              {avatarUrl && <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-full object-cover border shrink-0" />}
              <Input type="file" accept="image/*" onChange={handleFileUpload} className="cursor-pointer file:cursor-pointer flex-1 text-[11px] h-9" />
            </div>
          </div>
          <div className="pt-4 border-t border-border space-y-4">
            <h4 className="text-sm font-semibold">Change Password</h4>
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Required only if changing password" />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-4">Save Profile</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

