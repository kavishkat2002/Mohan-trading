import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    interested_car: "",
    budget: "",
    status: "New"
  });

  const fetchLeads = () => {
    fetch("http://localhost:5001/api/leads")
      .then(res => res.json())
      .then(data => {
        setLeads(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

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
        setNewLead({ name: "", phone: "", interested_car: "", budget: "", status: "New" });
        fetchLeads(); // Refresh leads
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.error || "Could not add lead", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setIsAdding(false);
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.phone.includes(search) ||
    l.interested_car?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'new': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'contacted': return "bg-amber-100 text-amber-800 border-amber-200";
      case 'negotiating': return "bg-purple-100 text-purple-800 border-purple-200";
      case 'closed deal': return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lead Registry</h1>
          <p className="text-slate-500">Manage all your incoming WhatsApp and web leads.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Manually enter a customer's details into the CRM pipeline.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLead} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  required 
                  value={newLead.name}
                  onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone / WhatsApp</Label>
                <Input 
                  id="phone" 
                  placeholder="+1234567890" 
                  required 
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car">Interested Car (Optional)</Label>
                <Input 
                  id="car" 
                  placeholder="e.g. BMW X5" 
                  value={newLead.interested_car}
                  onChange={(e) => setNewLead({...newLead, interested_car: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Input 
                  id="budget" 
                  placeholder="e.g. $45,000" 
                  value={newLead.budget}
                  onChange={(e) => setNewLead({...newLead, budget: e.target.value})}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Lead
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="relative w-full md:max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
             <Input 
               placeholder="Search name, phone, or car..." 
               className="pl-9 bg-white border-slate-200"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
             />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Name</TableHead>
                  <TableHead className="font-semibold text-slate-600">WhatsApp</TableHead>
                  <TableHead className="font-semibold text-slate-600">Interest</TableHead>
                  <TableHead className="font-semibold text-slate-600">Budget</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      No leads found. Switch on WhatsApp bot to capture leads or manually add above!
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map(lead => (
                    <TableRow key={lead.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <TableCell className="font-medium text-slate-900">{lead.name}</TableCell>
                      <TableCell className="text-slate-600">{lead.phone}</TableCell>
                      <TableCell className="text-slate-800">{lead.interested_car || "-"}</TableCell>
                      <TableCell className="text-slate-600 font-mono text-sm">{lead.budget || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-500 text-sm">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
