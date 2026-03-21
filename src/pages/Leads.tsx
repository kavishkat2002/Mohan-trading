import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Pencil, Trash2, MoreHorizontal, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

const sourceIcons: Record<string, { label: string; color: string }> = {
  whatsapp:  { label: "WhatsApp",  color: "bg-emerald-500" },
  facebook:  { label: "Facebook",  color: "bg-blue-600" },
  instagram: { label: "Instagram", color: "bg-pink-500" },
  tiktok:    { label: "TikTok",    color: "bg-foreground" },
  web:       { label: "Website",   color: "bg-primary" },
  manual:    { label: "Manual",    color: "bg-muted-foreground" },
};

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editLead, setEditLead] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { toast } = useToast();

  const [newLead, setNewLead] = useState({
    name: "", phone: "", interested_car: "", budget: "", status: "New", source: "manual"
  });

  const fetchLeads = () => {
    fetch("http://localhost:5001/api/leads")
      .then(res => res.json())
      .then(data => { setLeads(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => { fetchLeads(); }, []);

  // Add
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

  // Edit
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
          interested_car: editLead.interested_car,
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

  // Delete
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

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || 
      l.phone.includes(search) ||
      l.interested_car?.toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === "all" || (l.source || "manual") === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const getStatusStyle = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'new': return "bg-primary/10 text-primary border-primary/20";
      case 'contacted': return "bg-amber-50 text-amber-700 border-amber-200";
      case 'negotiating': return "bg-violet-50 text-violet-700 border-violet-200";
      case 'test drive': return "bg-sky-50 text-sky-700 border-sky-200";
      case 'closed deal': return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSourceInfo = (source: string) => sourceIcons[source] || sourceIcons.manual;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Lead Registry</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Manage all your incoming <span className="text-emerald-600 font-medium">WhatsApp</span>, <span className="text-blue-600 font-medium">Facebook</span>, <span className="text-pink-500 font-medium">Instagram</span> & <span className="font-medium text-foreground/70">TikTok</span> leads. Admin can edit and delete customer details.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white hover:bg-primary/90 text-sm h-9 px-4 shadow-sm shadow-primary/20">
              <Plus className="mr-2 h-3.5 w-3.5" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Lead</DialogTitle>
              <DialogDescription>Manually enter a customer's details into the CRM pipeline.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLead} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Customer Name</Label>
                  <Input placeholder="John Doe" required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone / WhatsApp</Label>
                  <Input placeholder="+1234567890" required value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Interested Car</Label>
                  <Input placeholder="e.g. BMW X5" value={newLead.interested_car} onChange={e => setNewLead({...newLead, interested_car: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Budget</Label>
                  <Input placeholder="e.g. Rs. 7,500,000" value={newLead.budget} onChange={e => setNewLead({...newLead, budget: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lead Source</Label>
                <Select value={newLead.source} onValueChange={v => setNewLead({...newLead, source: v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="web">Website</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="text-sm h-9">Cancel</Button>
                <Button type="submit" disabled={isAdding} className="bg-primary text-white hover:bg-primary/90 text-sm h-9">
                  {isAdding && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Save Lead
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Source filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All Leads", color: "" },
          { key: "whatsapp", label: "WhatsApp", color: "bg-emerald-500" },
          { key: "facebook", label: "Facebook", color: "bg-blue-600" },
          { key: "instagram", label: "Instagram", color: "bg-pink-500" },
          { key: "tiktok", label: "TikTok", color: "bg-foreground" },
          { key: "web", label: "Website", color: "bg-primary" },
          { key: "manual", label: "Manual", color: "bg-muted-foreground" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSourceFilter(s.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              sourceFilter === s.key
                ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                : "bg-white text-foreground/70 border-border hover:border-primary/30"
            }`}
          >
            {s.color && <div className={`h-2 w-2 rounded-full ${sourceFilter === s.key ? "bg-white" : s.color}`} />}
            {s.label}
            {s.key !== "all" && (
              <span className={`text-[10px] ${sourceFilter === s.key ? "text-white/70" : "text-muted-foreground"}`}>
                {leads.filter(l => (l.source || "manual") === s.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full md:max-w-xs">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
             <Input 
               placeholder="Search name, phone, or car..." 
               className="pl-9 h-9 text-sm bg-background border-border"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          <p className="text-xs text-muted-foreground">{filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} found</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-background/50">
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Interest</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <MessageCircle className="h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">No leads found.</p>
                      <p className="text-xs text-muted-foreground/60">Connect your WhatsApp, Facebook, Instagram, or TikTok to auto-capture leads.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map(lead => {
                  const src = getSourceInfo(lead.source || "manual");
                  return (
                    <TableRow key={lead.id} className="hover:bg-primary/[0.02] transition-colors border-border group">
                      <TableCell className="font-medium text-foreground text-sm">{lead.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{lead.phone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${src.color}`} />
                          <span className="text-xs text-foreground/70">{src.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/80">{lead.interested_car || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{lead.budget || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] font-medium rounded-md px-2 py-0.5 ${getStatusStyle(lead.status)}`}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => { setEditLead({...lead}); setIsEditOpen(true); }} className="text-xs gap-2">
                              <Pencil className="h-3 w-3" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setDeleteId(lead.id); setIsDeleteOpen(true); }} className="text-xs gap-2 text-red-600 focus:text-red-600">
                              <Trash2 className="h-3 w-3" /> Delete Lead
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Lead</DialogTitle>
            <DialogDescription>Update this customer's information.</DialogDescription>
          </DialogHeader>
          {editLead && (
            <form onSubmit={handleEditLead} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                  <Input value={editLead.name} onChange={e => setEditLead({...editLead, name: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
                  <Input value={editLead.phone} onChange={e => setEditLead({...editLead, phone: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Interested Car</Label>
                  <Input value={editLead.interested_car || ""} onChange={e => setEditLead({...editLead, interested_car: e.target.value})} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Budget</Label>
                  <Input value={editLead.budget || ""} onChange={e => setEditLead({...editLead, budget: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={editLead.status} onValueChange={v => setEditLead({...editLead, status: v})}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Source</Label>
                  <Select value={editLead.source || "manual"} onValueChange={v => setEditLead({...editLead, source: v})}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="web">Website</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-sm h-9">Cancel</Button>
                <Button type="submit" className="bg-primary text-white hover:bg-primary/90 text-sm h-9">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="font-display text-red-600">Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove this lead? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="text-sm h-9">Cancel</Button>
            <Button onClick={handleDeleteLead} className="bg-red-600 text-white hover:bg-red-700 text-sm h-9">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
