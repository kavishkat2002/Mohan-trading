import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldAlert, Power, RefreshCw, CalendarDays, AlertTriangle, Building2, ExternalLink, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function SuperAdmin() {
  const { user, loading } = useAuth();
  const [subStatus, setSubStatus] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [customDate, setCustomDate] = useState("");

  // ONLY ALLOW SPECIFIC EMAILS
  const isSuperAdmin = user?.email?.toLowerCase() === "info@creativexlab.com" || user?.email?.toLowerCase() === "tkavishka101@gmail.com";

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/subscription`);
      const data = await res.json();
      setSubStatus(data); // Instantly updates daysLeft & isExpired
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchSubscription();
  }, [isSuperAdmin]);

  const handleRenew = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/subscription/renew`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const data = await res.json();
        setSubStatus(data); // Instantly update UI
        toast.success("Subscription renewed for 30 days!");
      }
    } catch (err) {
      toast.error("Failed to renew");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetCustomDate = async () => {
    if (!customDate) { toast.error("Please select a date first."); return; }
    try {
      setActionLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/subscription/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_at: customDate, status: "Active" })
      });
      if (res.ok) {
        const data = await res.json();
        setSubStatus(data); // Instantly update both Status + Expiration Date
        toast.success(`Expiry set to ${new Date(customDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
        setCustomDate("");
      }
    } catch (err) {
      toast.error("Failed to set custom date");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!window.confirm("WARNING: This will instantly lock the client out of their dashboard. Are you sure?")) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/subscription/suspend`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSubStatus(data); // Instantly update UI
        toast.error("Account suspended.");
      }
    } catch (err) {
      toast.error("Failed to suspend");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const isExpired = subStatus?.status === 'Suspended' || new Date(subStatus?.expires_at) < new Date();
  const daysLeft = subStatus ? Math.ceil((new Date(subStatus.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Creativex Super Admin</h1>
              <p className="text-sm text-slate-500 font-medium">Manage SaaS Tenant Subscriptions</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Logged in as</p>
            <p className="text-sm font-mono bg-slate-100 px-3 py-1 rounded-md text-slate-700">{user?.email}</p>
          </div>
        </div>

        {/* Tenant List */}
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-1">
          <Building2 className="h-5 w-5 text-slate-400" /> Active Tenants
        </h2>

        {fetching && !subStatus ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900">Mohan Trading CRM</h3>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs font-mono">ID: TENANT-001</Badge>
                  </div>
                  <a href="https://mohantrading.lk" target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 w-fit">
                    View Website <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-xl border border-slate-100">
                  <div className="text-center px-4 border-r border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Plan</p>
                    <p className="text-sm font-bold text-slate-800">{subStatus?.plan_type || 'Starter'}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    {isExpired ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 shadow-none"><AlertTriangle className="h-3 w-3 mr-1" /> Suspended</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 shadow-none">Active ({daysLeft} days)</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-600">Subscription Actions</p>
                  <div className="flex gap-3">
                    <Button onClick={handleRenew} disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200">
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Add 30 Days
                    </Button>
                    <Button onClick={handleSuspend} disabled={actionLoading || isExpired} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                      <Power className="h-4 w-4 mr-2" /> Suspend
                    </Button>
                  </div>

                  {/* Custom Date Setter */}
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 space-y-2.5">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5" /> Set Custom Expiry Date
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={customDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={e => setCustomDate(e.target.value)}
                        className="h-9 text-sm bg-white border-indigo-200 focus-visible:ring-indigo-400"
                      />
                      <Button
                        onClick={handleSetCustomDate}
                        disabled={actionLoading || !customDate}
                        className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 shrink-0"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Date"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-indigo-500">Pick any date to set as the exact expiry date for this tenant.</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Expiration Date</p>
                    <p className="text-sm text-slate-500 mt-0.5 font-mono">
                      {subStatus?.expires_at ? new Date(subStatus.expires_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
