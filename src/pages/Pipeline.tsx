import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  { id: "New", title: "New Leads", color: "bg-blue-500" },
  { id: "Contacted", title: "Contacted / Follow-up", color: "bg-amber-500" },
  { id: "Test Drive", title: "Test Drive", color: "bg-purple-500" },
  { id: "Negotiating", title: "Negotiating", color: "bg-indigo-500" },
  { id: "Closed Deal", title: "Closed Deal", color: "bg-emerald-500" }
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

    // Optimistic update
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
      // Revert would go here typically
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Pipeline</h1>
        <p className="text-slate-500">Drag and drop leads to progress through the sales cycle.</p>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 flex-1 items-start snap-x">
        {columns.map(col => {
          const colLeads = leads.filter(l => (l.status || "New").toLowerCase() === col.id.toLowerCase());
          return (
            <div
              key={col.id}
              className="bg-slate-100/50 rounded-xl min-w-[320px] max-w-[320px] shrink-0 border border-slate-200/60 shadow-sm snap-start flex flex-col max-h-full"
              onDrop={(e) => handleDrop(e, col.id)}
              onDragOver={handleDragOver}
            >
              <div className="p-4 border-b border-slate-200/60 flex justify-between items-center bg-white/50 rounded-t-xl sticky top-0 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-slate-800">{col.title}</h3>
                </div>
                <Badge variant="secondary" className="font-mono">{colLeads.length}</Badge>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1 flex flex-col">
                {colLeads.map(lead => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id.toString())}
                    className="cursor-move border-slate-200 shadow-sm hover:shadow-md hover:border-primary/40 transition-all bg-white"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-slate-900 line-clamp-1">{lead.name}</div>
                      </div>
                      <div className="space-y-1.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Car className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{lead.interested_car || "Any"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-mono">
                          <span className="text-emerald-600 font-medium">{lead.budget || "TBD"}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm border-slate-200 text-slate-600 hover:text-green-600 hover:border-green-200 bg-slate-50">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 bg-slate-50">
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colLeads.length === 0 && (
                  <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center p-6 text-slate-400 text-sm">
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
