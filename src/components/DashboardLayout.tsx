import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, MessageSquare, ListTodo,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Car, Menu, X, Shield, CalendarClock, Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Vehicles", icon: Car, path: "/dashboard/vehicles" },
  { label: "Leads", icon: Users, path: "/dashboard/leads" },
  { label: "Chat Box", icon: MessageSquare, path: "/dashboard/chat" },
  { label: "Attendance", icon: CalendarClock, path: "/dashboard/attendance" },
  { label: "Finance", icon: Banknote, path: "/dashboard/finance" },
  { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
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
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const isElevated = user?.role === 'owner' || user?.role === 'admin';
  const filteredNavItems = navItems.filter(item => {
    if (isElevated) return true;
    if (user?.role === 'accountant') {
      return ["Dashboard", "Vehicles", "Leads", "Attendance", "Finance", "Settings"].includes(item.label);
    }
    return ["Dashboard", "Vehicles", "Leads", "Chat Box", "Attendance"].includes(item.label);
  });

  const [commissionTotal, setCommissionTotal] = useState<number>(0);
  const [companyStats, setCompanyStats] = useState<{revenue: number, payout: number} | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    // Check Notifications
    fetch(`http://localhost:5001/api/users/${user.id}/notifications`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          data.forEach(n => {
            // Push toast notification
            toast({ title: "New Notification", description: n.message });
            // Mark as read
            fetch(`http://localhost:5001/api/users/notifications/${n.id}/read`, { method: "PUT" });
          });
        }
      })
      .catch(console.error);

    // Fetch Commissions if Sales Person
    if (!isElevated) {
      fetch(`http://localhost:5001/api/users/${user.id}/commissions`)
        .then(res => res.json())
        .then(data => setCommissionTotal(data.total))
        .catch(console.error);
    }

    // Fetch Company Stats for Owner & Accountant
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
          src="/mohantrader-logo.png" 
          alt="MohanTrader" 
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
              <p className="text-[17px] font-semibold text-white leading-tight">
                Mohan Trader
              </p>
              <p className="text-[10px] text-white/40 tracking-wide italic leading-tight mt-0.5">
                Delivering Dreams, Driving Trust
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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — dark navy */}
      {!isMobile && (
        <aside className={cn(
          "hidden md:flex flex-col bg-sidebar transition-all duration-300 relative z-20",
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
      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        <header className="h-14 border-b border-border flex items-center px-5 md:px-6 gap-3 bg-white shrink-0 z-10 sticky top-0">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="mr-1 h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h2 className="font-sans font-semibold text-sm tracking-tight text-foreground uppercase">
            {navItems.find(n => location.pathname.startsWith(n.path))?.label || "Dashboard"}
          </h2>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-semibold text-foreground capitalize tracking-wide">{user?.role?.replace('_', ' ') || user?.role} Profile</p>
              <div className="flex flex-col items-end">
                <p className="text-[11px] text-muted-foreground">{profileName || user?.email}</p>
                {!isElevated && user?.role !== 'accountant' && commissionTotal > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Comm: LKR {commissionTotal}</p>
                )}
                {(user?.role === 'owner' || user?.role === 'accountant') && companyStats && (
                  <div className="flex flex-col items-end">
                    <p className="text-[9px] text-emerald-600 font-bold leading-none">Net Rev: {companyStats.revenue.toLocaleString()}</p>
                    <p className="text-[9px] text-rose-500 font-bold mt-0.5 leading-none">Payout: {companyStats.payout.toLocaleString()}</p>
                  </div>
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
          setProfileName={setProfileName}
          setProfileAvatar={setProfileAvatar}
        />

        <div className="flex-1 overflow-auto p-5 md:p-8 scrollbar-minimal flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1"
          >
            {children}
          </motion.div>

          {/* Footer */}
          <footer className="mt-12 pt-4 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Design & Developed By © 2026 <span className="font-medium text-foreground/70">Creative LabX</span> All Rights Reserved.
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Powered by <span className="font-medium text-foreground/50">Clientplus Digital</span>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function ProfileSettingsDialog({ open, onOpenChange, user, setProfileName, setProfileAvatar }: { open: boolean; onOpenChange: (open: boolean) => void; user: any; setProfileName: (n:string)=>void; setProfileAvatar: (a:string)=>void; }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);
    
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/users/${user.id}/avatar`, {
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
    if (open && user?.id) {
      fetch(`http://localhost:5001/api/users/${user.id}/profile`)
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
  }, [open, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword && !oldPassword) {
      toast({ title: "Old Password required", description: "You must enter your old password to set a new one.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/users/${user.id}/profile`, {
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
