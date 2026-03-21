import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, MessageSquare, ListTodo,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Car, Menu, X, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Vehicles", icon: Car, path: "/dashboard/vehicles" },
  { label: "Leads", icon: Users, path: "/dashboard/leads" },
  { label: "Chat Box", icon: MessageSquare, path: "/dashboard/chat" },
  { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
  { label: "Admin Panel", icon: Shield, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const isMobile = useIsMobile();
  
  const isOwner = user?.role === 'owner';
  const filteredNavItems = navItems.filter(item => {
    if (isOwner) return true;
    return ["Dashboard", "Vehicles", "Leads", "Chat Box"].includes(item.label);
  });

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
          <div className="ml-auto flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
               <span className="text-xs font-semibold text-primary">MT</span>
             </div>
          </div>
        </header>

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
