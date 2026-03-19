import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, MessageSquare, ListTodo,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Car, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Vehicles", icon: Car, path: "/dashboard/vehicles" },
  { label: "Leads", icon: Users, path: "/dashboard/leads" },
  { label: "Pipeline", icon: ListTodo, path: "/dashboard/pipeline" },
  { label: "Chat Box", icon: MessageSquare, path: "/dashboard/chat" },
  { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = () => {
    logout();
    navigate("/auth");
  };

  const sidebarWidth = collapsed ? "w-[68px]" : "w-64";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-3 p-4 border-b border-sidebar-border", collapsed && "justify-center")}>
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Car className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-display font-bold text-sm truncate">Mohan Trading</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">CRM Platform</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 relative z-10", active ? "text-primary" : "")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="relative z-10 whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-destructive w-full transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
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
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {!isMobile && (
        <aside className={cn("hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shadow-sm relative z-20", sidebarWidth)}>
          <SidebarContent />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute top-6 -right-3 z-50 h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-md hover:bg-slate-50 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </aside>
      )}

      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <motion.aside
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            className="relative w-64 bg-white border-r border-slate-200 z-50 shadow-xl"
          >
            <SidebarContent />
          </motion.aside>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        <header className="h-16 border-b border-slate-200 flex items-center px-4 md:px-6 gap-3 bg-white shrink-0 shadow-sm z-10 sticky top-0">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h2 className="font-display font-semibold text-xl text-slate-800 tracking-tight">
            {navItems.find(n => location.pathname.startsWith(n.path))?.label || "Dashboard"}
          </h2>
          <div className="ml-auto flex items-center gap-4">
             {/* Reserved for User profile / Notifications */}
             <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-inner">
               <Users className="h-4 w-4 text-slate-500" />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50/50">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
