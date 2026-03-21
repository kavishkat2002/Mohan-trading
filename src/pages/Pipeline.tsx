import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Car, MessageCircle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Lead = {
  id: number;
  name: string;
  phone: string;
  interested_car: string;
  budget: string;
  status: string;
};

const columns = [
  { id: "New", title: "New", color: "bg-primary" },
  { id: "Contacted", title: "Contacted", color: "bg-amber-400" },
  { id: "Test Drive", title: "Test Drive", color: "bg-sky-400" },
  { id: "Negotiating", title: "Negotiating", color: "bg-violet-400" },
  { id: "Closed Deal", title: "Closed", color: "bg-emerald-500" }
];

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
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
  }, []);

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    setLeads(prev => prev.map(l => l.id.toString() === leadId ? { ...l, status: newStatus } : l));

    try {
      const res = await fetch(`http://localhost:5001/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ title: "Pipeline Updated", description: `Lead moved to ${newStatus}` });
    } catch (err) {
      toast({ title: "Error", description: "Could not update lead status.", variant: "destructive" });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Sales Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Drag and drop leads to progress through the sales cycle.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start scrollbar-minimal">
        {columns.map(col => {
          const colLeads = leads.filter(l => (l.status || "New").toLowerCase() === col.id.toLowerCase());
          return (
            <div
              key={col.id}
              className="bg-white border border-border rounded-lg min-w-[280px] max-w-[280px] shrink-0 flex flex-col max-h-full"
              onDrop={(e) => handleDrop(e, col.id)}
              onDragOver={handleDragOver}
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{col.title}</h3>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded">{colLeads.length}</span>
              </div>

              {/* Column body */}
              <div className="p-3 overflow-y-auto space-y-2 flex-1 flex flex-col scrollbar-minimal bg-background/30">
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id.toString())}
                    className="cursor-move border border-border rounded-lg p-3.5 bg-white hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
                  >
                    <div className="font-medium text-sm text-foreground mb-2">{lead.name}</div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Car className="h-3 w-3 text-primary/40" />
                        <span>{lead.interested_car || "Any"}</span>
                      </div>
                      <div className="font-mono text-emerald-600 font-medium">
                        {lead.budget || "TBD"}
                      </div>
                    </div>
                    <div className="pt-2.5 mt-2 border-t border-border/50 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5">
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {colLeads.length === 0 && (
                  <div className="flex-1 border-2 border-dashed border-primary/10 rounded-lg flex items-center justify-center p-6 text-xs text-muted-foreground/50">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
