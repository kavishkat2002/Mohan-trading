import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Search, Plus, Pencil, Trash2, MoreHorizontal, MessageCircle, 
  UserPlus, DollarSign, Kanban, List, Sparkles, TrendingUp, Users, Clock, 
  Percent, Phone, ArrowRight, ExternalLink, Briefcase, Mail, Layers
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// High-end premium channel brand colors and configurations
const sourceStyles: Record<string, {
  label: string;
  dotColor: string;
  badgeClass: string;
}> = {
  whatsapp: { 
    label: "WhatsApp", 
    dotColor: "bg-emerald-500", 
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100"
  },
  facebook: { 
    label: "Facebook", 
    dotColor: "bg-blue-500", 
    badgeClass: "bg-blue-50 text-blue-700 border-blue-100"
  },
  manual: { 
    label: "Manual", 
    dotColor: "bg-slate-400", 
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200"
  },
};

const KANBAN_COLUMNS = [
  { id: "New", title: "New Stage", color: "bg-blue-500" },
  { id: "Contacted", title: "Contacted", color: "bg-amber-500" },
  { id: "Test Drive", title: "Test Drive", color: "bg-sky-500" },
  { id: "Negotiating", title: "Negotiating", color: "bg-violet-500" },
];

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "previous">("table");
  
  // Dialog/Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editLead, setEditLead] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Drawer Detail Flyout state
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const isElevated = user?.role === 'owner' || user?.role === 'admin';
  const [team, setTeam] = useState<any[]>([]);

  // Modals for Actions
  const [assignLead, setAssignLead] = useState<any | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [commissionLead, setCommissionLead] = useState<any | null>(null);
  const [commissionAmount, setCommissionAmount] = useState<string>("");

  const [newLead, setNewLead] = useState({
    name: "", phone: "", interested_car: "", budget: "", status: "New", source: "manual"
  });

  const parseBudget = (budget: string | null | undefined): number => {
    if (!budget) return 0;
    const clean = budget.replace(/[^0-9]/g, "");
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatLKR = (num: number): string => {
    if (num >= 1000000) {
      return `LKR ${(num / 1000000).toFixed(1)} M`;
    }
    return `LKR ${num.toLocaleString()}`;
  };

  const fetchLeads = async () => {
    try {
      // 1. Fetch from Supabase WhatsApp Leads
      const { data: supaLeads, error: supaErr } = await supabase.from('leads').select('*');
      
      if (!supaErr && supaLeads && supaLeads.length > 0) {
        // Sync them to backend
        await fetch("http://localhost:5001/api/leads/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: supaLeads })
        });
      }

      // 2. Fetch the newly merged data from main CRM
      const res = await fetch("http://localhost:5001/api/leads");
      const data = await res.json();
      setLeads(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchLeads(); 
    if (isElevated) {
      fetch("http://localhost:5001/api/admin/users")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTeam(data.filter((u: any) => u.role !== 'owner' && u.id !== user?.id));
          }
        });
    }
  }, [isElevated]);

  // Add Lead Handler
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch("http://localhost:5001/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Lead added successfully!" });
        setIsOpen(false);
        setNewLead({ name: "", phone: "", interested_car: "", budget: "", status: "New", source: "manual" });
        fetchLeads();
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.error || "Could not add lead", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setIsAdding(false);
  };

  // Edit Lead Handler
  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    try {
      const res = await fetch(`http://localhost:5001/api/leads/${editLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editLead.name,
          phone: editLead.phone,
          interested_product: editLead.interested_product || editLead.interested_car,
          budget: editLead.budget,
          status: editLead.status,
          source: editLead.source || "manual",
        }),
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Lead details updated." });
        setIsEditOpen(false);
        setEditLead(null);
        fetchLeads();
      } else {
        toast({ title: "Failed", description: "Could not update lead.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  };

  // Delete Lead Handler
  const handleDeleteLead = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`http://localhost:5001/api/leads/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: "Lead removed from registry." });
        setIsDeleteOpen(false);
        setDeleteId(null);
        fetchLeads();
      } else {
        toast({ title: "Failed", description: "Could not delete lead.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  };

  // Assign Lead Handler
  const handleAssignLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignLead || !selectedAssignee) return;
    const selectedMember = team.find((m: any) => m.id === selectedAssignee);
    const assigneeName = selectedMember?.email || selectedAssignee;
    try {
      const res = await fetch(`http://localhost:5001/api/leads/${assignLead.id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assigned_to: selectedAssignee,
          assigned_to_name: assigneeName,
          assigner_name: (user as any)?.name || user?.email 
        })
      });
      if (res.ok) {
        toast({ title: "Assigned", description: `Lead assigned to ${assigneeName}.` });
        setAssignLead(null);
        setSelectedAssignee("");
        fetchLeads();
      } else {
        const err = await res.json();
        toast({ title: "Failed", description: err.error || "Could not assign lead", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  // Commission Close Handler
  const handleCommissionClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commissionLead) return;
    try {
      const res = await fetch(`http://localhost:5001/api/leads/${commissionLead.id}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commission_amount: parseFloat(commissionAmount) || 0 })
      });
      if (res.ok) {
        toast({ title: "Deal Closed", description: "Commission registered and deal finalized!" });
        setCommissionLead(null);
        setCommissionAmount("");
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Partial status update (Kanban column move)
  const updateLeadStatus = async (lead: any, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone,
          interested_product: lead.interested_product || lead.interested_car,
          budget: lead.budget,
          status: newStatus,
          source: lead.source || "manual",
        }),
      });
      if (res.ok) {
        toast({ title: "Status Updated", description: `Lead status changed to ${newStatus}.` });
        fetchLeads();
      } else {
        toast({ title: "Failed", description: "Could not update status.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  };

  // Filtering Logic
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || 
      l.phone.includes(search) ||
      (l.interested_car || l.interested_product || "").toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === "all" || (l.source || "manual").toLowerCase() === sourceFilter.toLowerCase();
    
    const isPreviousCustomer = ["closed deal", "closed", "missed deal"].includes((l.status || "").toLowerCase());
    const matchesViewMode = viewMode === "previous" ? isPreviousCustomer : !isPreviousCustomer;

    return matchesSearch && matchesSource && matchesViewMode;
  });

  // Metric Calculation
  const totalPipeline = leads
    .filter(l => !["closed deal", "closed"].includes(l.status?.toLowerCase()))
    .reduce((sum, l) => sum + parseBudget(l.budget), 0);
  
  const warmLeads = leads.filter(l => 
    ["negotiating", "test drive", "contacted"].includes(l.status?.toLowerCase())
  ).length;

  const closedLeads = leads.filter(l => 
    ["closed deal", "closed"].includes(l.status?.toLowerCase())
  );
  
  const conversionRate = leads.length > 0 ? Math.round((closedLeads.length / leads.length) * 100) : 0;

  const getStatusStyle = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'new': return "bg-blue-50 text-blue-700 border-blue-200";
      case 'contacted': return "bg-amber-50 text-amber-700 border-amber-200";
      case 'negotiating': return "bg-violet-50 text-violet-700 border-violet-200";
      case 'test drive': return "bg-sky-50 text-sky-700 border-sky-200";
      case 'closed deal': return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case 'missed deal': return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getSourceInfo = (source: string) => {
    const key = (source || "manual").toLowerCase();
    return sourceStyles[key] || sourceStyles.manual;
  };

  const getLeadsByStatus = (statusId: string) => {
    return filteredLeads.filter(l => l.status?.toLowerCase() === statusId.toLowerCase());
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header section with view switcher */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">Lead Registry</h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
            Manage incoming <span className="text-emerald-600 font-semibold">WhatsApp</span> & <span className="text-blue-600 font-semibold">Facebook</span> deals. Track metrics, assign members, and declare commissions.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto shrink-0">
          {/* Layout Toggle View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-center shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table Workspace
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Pipeline Board
            </button>
            <button
              onClick={() => setViewMode("previous")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === "previous"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Previous Customers
            </button>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/95 text-xs font-bold h-10 px-5 rounded-xl shadow-lg shadow-primary/10">
                <Plus className="mr-2 h-4 w-4" /> Manual Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold">Add New Lead</DialogTitle>
                <DialogDescription>Manually enter a customer's details into the CRM pipeline.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddLead} className="space-y-4 py-3">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Name</Label>
                    <Input placeholder="John Doe" required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="h-10 text-xs rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone / WhatsApp</Label>
                    <Input placeholder="+1234567890" required value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="h-10 text-xs rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interested Car</Label>
                    <Input placeholder="e.g. BMW X5" value={newLead.interested_car} onChange={e => setNewLead({...newLead, interested_car: e.target.value})} className="h-10 text-xs rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</Label>
                    <Input placeholder="e.g. Rs. 7,500,000" value={newLead.budget} onChange={e => setNewLead({...newLead, budget: e.target.value})} className="h-10 text-xs rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Source</Label>
                  <Select value={newLead.source} onValueChange={v => setNewLead({...newLead, source: v})}>
                    <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="text-xs h-10 rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={isAdding} className="bg-primary text-white hover:bg-primary/90 text-xs h-10 rounded-xl">
                    {isAdding && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Save Lead
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 1. PIPELINE METRICS SUMMARY SECTION */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sales Pipeline Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-slate-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Pipeline</span>
              <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-3">{formatLKR(totalPipeline)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Excludes finalized deals</p>
          </div>
        </div>

        {/* Total Leads Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-slate-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</span>
              <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-3">{leads.length}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Across all platforms</p>
          </div>
        </div>

        {/* Warm Leads Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-slate-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hot Enquiries</span>
              <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-3">{warmLeads}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Negotiating or test drive</p>
          </div>
        </div>

        {/* Finalized Deals Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 bg-slate-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closed deals</span>
              <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-3">{closedLeads.length} <span className="text-xs font-normal text-slate-400">({conversionRate}%)</span></h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Conversion success rate</p>
          </div>
        </div>
      </div>

      {/* 2. CHIP FILTER SELECTORS */}
      <div className="flex flex-wrap gap-2 py-2">
        <button
          onClick={() => setSourceFilter("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
            sourceFilter === "all"
              ? "bg-slate-900 text-white border-slate-950 shadow-md shadow-slate-900/10"
              : "bg-white text-slate-650 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${sourceFilter === "all" ? "bg-white" : "bg-slate-400"}`} />
          All Leads
          <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-md font-bold ${sourceFilter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
            {leads.length}
          </span>
        </button>

        {Object.entries(sourceStyles).map(([key, style]) => {
          const count = leads.filter(l => (l.source || "manual").toLowerCase() === key).length;
          const isActive = sourceFilter.toLowerCase() === key;
          return (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
                isActive 
                  ? "bg-slate-900 text-white border-slate-950 shadow-sm" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : style.dotColor}`} />
              {style.label}
              <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-md font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-550"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. WORKSPACE CORE VIEW AREA */}
      {viewMode === "kanban" ? (
        /* =================== KANBAN PIPELINE VIEW =================== */
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-minimal select-none">
          {KANBAN_COLUMNS.map(col => {
            const colLeads = getLeadsByStatus(col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col min-w-[310px] w-[310px] bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 shrink-0"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color.split(" ")[0]}`} />
                    <span className="font-bold text-slate-800 text-xs tracking-tight uppercase">{col.title}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full font-mono">
                    {colLeads.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1 scrollbar-minimal min-h-[350px]">
                  {colLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-250 rounded-xl text-center p-4">
                      <Layers className="h-6 w-6 text-slate-350 mb-2 opacity-50" />
                      <p className="text-[11px] text-slate-400 font-medium">No leads in this stage</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {colLeads.map(lead => {
                        const src = getSourceInfo(lead.source);
                        return (
                          <motion.div
                            key={lead.id}
                            layoutId={`lead-card-${lead.id}`}
                            whileHover={{ y: -2.5, scale: 1.01, boxShadow: "0 12px 24px -10px rgba(0,0,0,0.06)", borderColor: "hsl(var(--primary)/30%)" }}
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailsOpen(true);
                            }}
                            className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer transition-all duration-200 group relative flex flex-col justify-between gap-3.5"
                          >
                            {/* Card Top */}
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase shrink-0">
                                    {lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 text-xs leading-tight group-hover:text-primary transition-colors">
                                      {lead.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">{lead.phone}</p>
                                  </div>
                                </div>
                                
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border border-slate-200 bg-slate-50 text-slate-650">
                                  <div className={`h-1 w-1 rounded-full ${src.dotColor}`} />
                                  {src.label}
                                </span>
                              </div>

                              {/* Card Details */}
                              <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-[10px]">
                                <div>
                                  <p className="text-slate-400 font-medium">Interest</p>
                                  <p className="font-semibold text-slate-700 mt-0.5 truncate">{lead.interested_product || lead.interested_car || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium">Budget</p>
                                  <p className="font-semibold text-slate-700 mt-0.5 font-mono truncate">{lead.budget || "—"}</p>
                                </div>
                              </div>
                            </div>

                            {/* Card Bottom */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-1.5">
                                {lead.assigned_to ? (
                                  lead.assigned_to === user?.id ? (
                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[9px] border border-emerald-100">Me</span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-650 truncate max-w-[80px]">
                                      {lead.assigned_to_name || "Assigned"}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic">Unassigned</span>
                                )}
                              </div>

                              {/* Quick Move Selector (Dropdown) */}
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <Select
                                  value={lead.status}
                                  onValueChange={v => updateLeadStatus(lead, v)}
                                >
                                  <SelectTrigger className="h-6 text-[9px] py-0.5 px-2 bg-slate-50 border-slate-205 font-bold text-slate-500 hover:bg-slate-100 transition-colors w-fit gap-1 rounded-md">
                                    <SelectValue placeholder="Move" />
                                  </SelectTrigger>
                                  <SelectContent className="w-32">
                                    {KANBAN_COLUMNS.map(col => (
                                      <SelectItem key={col.id} value={col.id} className="text-[10px]">
                                        {col.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    {isElevated && (
                                      <DropdownMenuItem onClick={() => setAssignLead({...lead})} className="text-[11px] gap-1.5 text-primary font-medium">
                                        <UserPlus className="h-3.5 w-3.5" /> Assign Staff
                                      </DropdownMenuItem>
                                    )}
                                    {isElevated && lead.status !== 'Closed' && (
                                      <DropdownMenuItem onClick={() => setCommissionLead({...lead})} className="text-[11px] gap-1.5 text-amber-600 font-medium">
                                        <DollarSign className="h-3.5 w-3.5" /> Commission
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => { setEditLead({...lead}); setIsEditOpen(true); }} className="text-[11px] gap-1.5 font-medium">
                                      <Pencil className="h-3.5 w-3.5" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setDeleteId(lead.id); setIsDeleteOpen(true); }} className="text-[11px] gap-1.5 text-red-600 font-medium">
                                      <Trash2 className="h-3.5 w-3.5" /> Delete Lead
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =================== TABLE LIST VIEW =================== */
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-slate-50/20">
            <div className="relative w-full md:max-w-xs">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
               <Input 
                 placeholder="Search name, phone, or car..." 
                 className="pl-9 h-9 text-xs bg-white border-slate-205 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />
            </div>
            <p className="text-xs font-semibold text-slate-500">{filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} catalogued</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-20 bg-white">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-slate-400 font-medium">Loading leads repository...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-6">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle Interest</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</TableHead>
                  {viewMode === "previous" && <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sold Price</TableHead>}
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Agent</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={viewMode === "previous" ? 9 : 8} className="text-center py-20 bg-white">
                      <div className="flex flex-col items-center gap-2">
                        <MessageCircle className="h-10 w-10 text-slate-200" />
                        <p className="text-sm font-semibold text-slate-655 text-slate-700">No matching leads found</p>
                        <p className="text-xs text-slate-400">Connect your WhatsApp or Facebook feeds to auto-sync leads.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map(lead => {
                    const src = getSourceInfo(lead.source);
                    return (
                      <TableRow 
                        key={lead.id} 
                        className="hover:bg-slate-50/60 transition-colors border-slate-100 cursor-pointer group"
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDetailsOpen(true);
                        }}
                      >
                        {/* Name with avatar */}
                        <TableCell className="pl-6 py-4 font-semibold text-slate-800 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase shrink-0">
                              {lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                            </div>
                            <div>
                              <span className="hover:text-primary transition-colors font-semibold block text-slate-800">
                                {lead.name}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-slate-500 font-mono font-semibold">{lead.phone}</TableCell>

                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-600">
                            <div className={`h-1.5 w-1.5 rounded-full ${src.dotColor}`} />
                            {src.label}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-slate-700">
                          {lead.interested_product || lead.interested_car || "—"}
                        </TableCell>

                        <TableCell>
                          {viewMode !== "previous" && lead.budget ? (
                            <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-105 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                              {lead.budget}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>

                        {viewMode === "previous" && (
                          <TableCell>
                            {lead.budget ? (
                              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                                {lead.budget}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </TableCell>
                        )}

                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 ${getStatusStyle(lead.status)}`}>
                            {lead.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-slate-650">
                          {lead.assigned_to ? (
                            lead.assigned_to === user?.id ? (
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[9px] border border-emerald-100">Me</span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-700">{lead.assigned_to_name || "Assigned"}</span>
                            )
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Unassigned</span>
                          )}
                          {lead.commission_amount > 0 && (isElevated || user?.role === 'accountant') && (
                            <div className="text-[10px] text-emerald-600 font-black mt-0.5 font-mono">
                              LKR {Number(lead.commission_amount).toLocaleString()}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right pr-6" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {isElevated && (
                                <DropdownMenuItem onClick={() => setAssignLead({...lead})} className="text-xs gap-2 text-primary font-semibold">
                                  <UserPlus className="h-3.5 w-3.5" /> Assign to Staff
                                </DropdownMenuItem>
                              )}
                              {isElevated && lead.status !== 'Closed' && (
                                <DropdownMenuItem onClick={() => setCommissionLead({...lead})} className="text-xs gap-2 text-amber-600 focus:text-amber-600 font-semibold">
                                  <DollarSign className="h-3.5 w-3.5" /> Declare Commission
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => { setEditLead({...lead}); setIsEditOpen(true); }} className="text-xs gap-2 font-semibold">
                                <Pencil className="h-3.5 w-3.5" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setDeleteId(lead.id); setIsDeleteOpen(true); }} className="text-xs gap-2 text-red-600 focus:text-red-600 font-semibold">
                                <Trash2 className="h-3.5 w-3.5" /> Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* 4. CUSTOMER DETAIL FLYOUT DRAWER ( Radix Sheet ) */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto scrollbar-minimal rounded-l-3xl border-l border-slate-200">
          {selectedLead && (
            <div className="space-y-6 pt-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-primary/20 shrink-0">
                  {selectedLead.name.split(" ").map((n: string) => n[0]).slice(0,2).join("").toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight">{selectedLead.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyle(selectedLead.status)}`}>
                      {selectedLead.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{selectedLead.phone}</span>
                  </div>
                </div>
              </div>

              {/* Direct Communication Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 bg-emerald-50/20 text-xs font-bold rounded-xl transition-all"
                >
                  <MessageCircle className="h-4.5 w-4.5 text-emerald-500" />
                  Message WhatsApp
                </a>
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-slate-50/20 text-xs font-bold rounded-xl transition-all"
                >
                  <Phone className="h-4.5 w-4.5 text-slate-500" />
                  Call Customer
                </a>
              </div>

              {/* Customer Core Information */}
              <div className="bg-slate-50/60 border border-slate-200/60 rounded-2xl p-4 space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Core Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold">Vehicle Interest</p>
                    <p className="font-semibold text-slate-700 mt-1">{selectedLead.interested_product || selectedLead.interested_car || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">Client Budget</p>
                    <p className="font-semibold text-slate-750 font-mono mt-1 text-slate-800">{selectedLead.budget || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">Lead Source Channel</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${getSourceInfo(selectedLead.source).dotColor}`} />
                      <span className="font-bold text-slate-700 capitalize">{getSourceInfo(selectedLead.source).label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">Captured Date</p>
                    <p className="font-semibold text-slate-700 mt-1">
                      {new Date(selectedLead.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Context Insights block */}
              {selectedLead.current_step && (
                <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">AI Intent Context</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-[10px] text-indigo-400 font-bold">Identified Engagement Stage</p>
                      <Badge variant="outline" className="text-[9px] font-black uppercase mt-1 bg-indigo-100/50 text-indigo-700 border-indigo-200">
                        {selectedLead.current_step.replace('_', ' ')}
                      </Badge>
                    </div>
                    {selectedLead.chat_metadata && typeof selectedLead.chat_metadata === 'object' && (
                      <div className="text-[11px] text-slate-650 bg-white border border-indigo-50 rounded-xl p-3 space-y-2 leading-relaxed">
                        {selectedLead.chat_metadata.type && (
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-semibold">Preference:</span>
                            <span className="text-slate-800 font-bold">{selectedLead.chat_metadata.type}</span>
                          </div>
                        )}
                        {selectedLead.chat_metadata.intent && (
                          <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-50">
                            <span className="text-slate-400 font-semibold">User Intent:</span>
                            <span className="text-slate-700 font-medium bg-slate-50 p-2 rounded-lg text-[10px] italic leading-normal border border-slate-100">
                              "{selectedLead.chat_metadata.intent}"
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assignee information block */}
              <div className="bg-white border border-slate-205 border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CRM Assignment Details</h4>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-450 text-slate-500 font-bold">Assigned Sales Agent</span>
                  <div className="flex items-center gap-2">
                    {selectedLead.assigned_to ? (
                      selectedLead.assigned_to === user?.id ? (
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-100">Me</span>
                      ) : (
                        <span className="font-bold text-slate-700">{selectedLead.assigned_to_name || "Agent"}</span>
                      )
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                    {isElevated && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssignLead({ ...selectedLead });
                          setIsDetailsOpen(false);
                        }}
                        className="h-7 text-[10px] px-2 rounded-lg font-bold"
                      >
                        Change Agent
                      </Button>
                    )}
                  </div>
                </div>

                {selectedLead.commission_amount > 0 && (isElevated || user?.role === 'accountant') && (
                  <div className="flex justify-between items-center text-xs pt-3.5 border-t border-slate-100">
                    <span className="text-slate-450 text-slate-500 font-bold">Declared Commission</span>
                    <span className="text-emerald-600 font-black font-mono">LKR {Number(selectedLead.commission_amount).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action operations button tray */}
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                {isElevated && selectedLead.status !== 'Closed' && (
                  <Button
                    onClick={() => {
                      setCommissionLead({ ...selectedLead });
                      setIsDetailsOpen(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 w-full flex items-center justify-center gap-1.5 rounded-xl shadow-md shadow-emerald-500/10"
                  >
                    <DollarSign className="h-4.5 w-4.5" />
                    Close Deal & Record Commission
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditLead({ ...selectedLead });
                      setIsEditOpen(true);
                      setIsDetailsOpen(false);
                    }}
                    className="flex-1 text-xs font-bold h-10 flex items-center justify-center gap-1.5 rounded-xl"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Details
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteId(selectedLead.id);
                      setIsDeleteOpen(true);
                      setIsDetailsOpen(false);
                    }}
                    className="flex-1 text-xs font-bold h-10 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 rounded-xl"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Lead
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. EDIT DETAILS DIALOG MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Edit Lead</DialogTitle>
            <DialogDescription>Update this customer's information.</DialogDescription>
          </DialogHeader>
          {editLead && (
            <form onSubmit={handleEditLead} className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</Label>
                  <Input value={editLead.name} onChange={e => setEditLead({...editLead, name: e.target.value})} className="h-10 text-xs rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</Label>
                  <Input value={editLead.phone} onChange={e => setEditLead({...editLead, phone: e.target.value})} className="h-10 text-xs rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interested Vehicle</Label>
                  <Input value={editLead.interested_product || editLead.interested_car || ""} onChange={e => setEditLead({...editLead, interested_product: e.target.value})} className="h-10 text-xs rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</Label>
                  <Input value={editLead.budget || ""} onChange={e => setEditLead({...editLead, budget: e.target.value})} className="h-10 text-xs rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</Label>
                  <Select value={editLead.status} onValueChange={v => setEditLead({...editLead, status: v})}>
                    <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Test Drive">Test Drive</SelectItem>
                      <SelectItem value="Negotiating">Negotiating</SelectItem>
                      <SelectItem value="Closed Deal">Closed Deal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source</Label>
                  <Select value={editLead.source || "manual"} onValueChange={v => setEditLead({...editLead, source: v})}>
                    <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs h-10 rounded-xl">Cancel</Button>
                <Button type="submit" className="bg-primary text-white hover:bg-primary/90 text-xs h-10 rounded-xl">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-red-600">Delete Lead permanently?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove this lead from CRM records? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="text-xs h-10 rounded-xl">Cancel</Button>
            <Button onClick={handleDeleteLead} className="bg-red-600 text-white hover:bg-red-700 text-xs h-10 rounded-xl">
              <Trash2 className="mr-2 h-4 w-4" /> Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. ASSIGN STAFF DIALOG */}
      <Dialog open={!!assignLead} onOpenChange={(open) => !open && setAssignLead(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Assign Lead to Staff</DialogTitle>
            <DialogDescription>
              Select a team member to assign <strong>{assignLead?.name}</strong> to handle the client transaction.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignLead} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-405 text-slate-500 uppercase tracking-wider">Select Sales Agent</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee} required>
                <SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Choose team member..." /></SelectTrigger>
                <SelectContent>
                  {team.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.email} ({member.role?.replace('_', ' ') || member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setAssignLead(null)} className="h-10 text-xs rounded-xl">Cancel</Button>
              <Button type="submit" className="bg-primary text-white h-10 text-xs rounded-xl">Assign Deal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. DECLARE COMMISSION DIALOG */}
      <Dialog open={!!commissionLead} onOpenChange={(open) => !open && setCommissionLead(null)}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-emerald-600">Close Deal & Register Pay</DialogTitle>
            <DialogDescription>
              Mark <strong>{commissionLead?.name}</strong> as closed and allocate sale commissions to the assigned agent.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCommissionClose} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commission Amount (LKR)</Label>
              <Input 
                type="number" 
                placeholder="e.g. 50000" 
                value={commissionAmount} 
                onChange={(e) => setCommissionAmount(e.target.value)} 
                required 
                min="0"
                className="h-11 text-base font-bold rounded-xl"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCommissionLead(null)} className="h-10 text-xs rounded-xl">Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-750 hover:bg-emerald-700 text-white h-10 text-xs rounded-xl shadow-md shadow-emerald-500/10">
                Confirm & Close Deal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
