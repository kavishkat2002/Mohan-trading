import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, Send, History, Users, Search, 
  CheckCircle2, Trash2, Loader2, Plus, MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Customer {
  id: number;
  name: string;
  phone: string;
  source: string;
  status: string;
  interested_product?: string;
  interested_car?: string;
  budget?: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  date: string;
  recipientsCount: number;
  status: string;
}

export default function Marketing() {
  const [activeTab, setActiveTab] = useState<"broadcast" | "history">("broadcast");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Broadcast Form States
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);

  // Campaign History Logs
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/leads");
      const data = await res.json();
      // Only include Customers (Closed deals OR whatsapp live chat syncs)
      const filtered = data.filter((l: any) => 
        ["closed deal", "closed"].includes((l.status || "").toLowerCase()) ||
        (l.source || "").toLowerCase() === "whatsapp"
      );
      setCustomers(filtered);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // Load campaign logs from localStorage
    const saved = localStorage.getItem("mohan_campaigns");
    if (saved) {
      try {
        setCampaigns(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    } else {
      // Seed default mockup campaign
      const defaultLogs: Campaign[] = [
        {
          id: "1",
          name: "LC300 Price Update Promo",
          message: "Hi! We have updated the prices of the Toyota Land Cruiser LC300 in our inventory. Contact us today for details!",
          date: new Date(Date.now() - 86400000 * 3).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          recipientsCount: 4,
          status: "Delivered"
        }
      ];
      setCampaigns(defaultLogs);
      localStorage.setItem("mohan_campaigns", JSON.stringify(defaultLogs));
    }
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCustomers.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      toast({ title: "Error", description: "Please enter a campaign name.", variant: "destructive" });
      return;
    }
    if (!messageTemplate.trim()) {
      toast({ title: "Error", description: "Please compose a broadcast message template.", variant: "destructive" });
      return;
    }
    if (selectedIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one recipient.", variant: "destructive" });
      return;
    }

    setSending(true);

    // Simulate WhatsApp API broadcast sending
    setTimeout(() => {
      const newCampaign: Campaign = {
        id: String(Date.now()),
        name: campaignName,
        message: messageTemplate,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        recipientsCount: selectedIds.length,
        status: "Sent"
      };

      const updatedCampaigns = [newCampaign, ...campaigns];
      setCampaigns(updatedCampaigns);
      localStorage.setItem("mohan_campaigns", JSON.stringify(updatedCampaigns));

      toast({
        title: "Campaign Broadcasted!",
        description: `WhatsApp broadcast campaign "${campaignName}" sent to ${selectedIds.length} customer(s).`
      });

      // Clear Form
      setCampaignName("");
      setMessageTemplate("");
      setSelectedIds([]);
      setSending(false);
      setActiveTab("history");
    }, 2000);
  };

  const handleDeleteCampaign = (id: string) => {
    const updated = campaigns.filter(c => c.id !== id);
    setCampaigns(updated);
    localStorage.setItem("mohan_campaigns", JSON.stringify(updated));
    toast({ title: "Removed", description: "Campaign log deleted." });
  };

  const filteredCustomers = customers.filter(c => {
    return c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search) ||
      (c.interested_car || c.interested_product || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Marketing Campaigns</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Broadcast bulk WhatsApp promotional messages to your customer registry and track dispatch campaign history.
          </p>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex gap-2 border-b border-slate-100 pb-px">
        <button
          onClick={() => setActiveTab("broadcast")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px rounded-t-xl ${
            activeTab === "broadcast"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Megaphone className="h-4 w-4" />
          WhatsApp Broadcast
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px rounded-t-xl ${
            activeTab === "history"
              ? "border-slate-900 text-slate-900 bg-slate-50/50"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <History className="h-4 w-4" />
          Campaign Logs
        </button>
      </div>

      {activeTab === "broadcast" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Compose Campaign Box */}
          <div className="lg:col-span-5">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader className="border-b border-slate-100 p-5">
                <CardTitle className="text-[14px] font-bold text-slate-800">Compose Broadcast Template</CardTitle>
                <CardDescription className="text-[11px] text-slate-400">Fill in target parameters to send live chats template.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <form onSubmit={handleSendCampaign} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Campaign Name</label>
                    <Input
                      placeholder="e.g. July Land Cruiser LC300 Promo"
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      className="h-9 text-xs rounded-xl border-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">WhatsApp Message Template</label>
                    <Textarea
                      placeholder="Compose message here... Use variable parameters if needed."
                      value={messageTemplate}
                      onChange={e => setMessageTemplate(e.target.value)}
                      rows={5}
                      className="text-xs rounded-xl border-slate-200 focus:ring-1 focus:ring-primary focus:border-primary resize-none bg-slate-50/20"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={sending}
                      className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold gap-2"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending Broadcast...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Send Broadcast ({selectedIds.length} Recipient{selectedIds.length !== 1 ? "s" : ""})
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Select Target Recipients Box */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 p-5 bg-slate-50/20">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <div>
                    <CardTitle className="text-[14px] font-bold text-slate-800">Target Recipients</CardTitle>
                    <CardDescription className="text-[11px] text-slate-400">Select customers from database registry.</CardDescription>
                  </div>
                  <div className="relative w-full sm:max-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <Input 
                      placeholder="Filter customers..." 
                      className="pl-8 h-8 text-[11px] bg-white border-slate-200 rounded-xl"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-150 bg-slate-50/30">
                        <TableHead className="w-12 pl-6">
                          <input 
                            type="checkbox"
                            className="h-4 w-4 text-primary border-slate-300 rounded cursor-pointer mt-1"
                            checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                            onChange={e => handleSelectAll(e.target.checked)}
                          />
                        </TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient Name</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-16 text-xs text-slate-400">
                            No matching customers found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map(c => (
                          <TableRow 
                            key={c.id} 
                            className={`hover:bg-slate-50/40 border-slate-100 cursor-pointer ${
                              selectedIds.includes(c.id) ? "bg-slate-50/20" : ""
                            }`}
                            onClick={() => handleSelectOne(c.id, !selectedIds.includes(c.id))}
                          >
                            <TableCell className="pl-6 py-3" onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox"
                                className="h-4 w-4 text-primary border-slate-300 rounded cursor-pointer mt-1"
                                checked={selectedIds.includes(c.id)}
                                onChange={e => handleSelectOne(c.id, e.target.checked)}
                              />
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-800">{c.name}</TableCell>
                            <TableCell className="text-xs text-slate-500 font-mono">{c.phone}</TableCell>
                            <TableCell className="text-xs text-slate-500 font-semibold">{c.interested_product || c.interested_car || "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      ) : (
        /* Campaign History Log View */
        <Card className="rounded-2xl border-slate-200/80 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 p-5 bg-slate-50/20">
            <CardTitle className="text-[14px] font-bold text-slate-800">Campaign History Logs</CardTitle>
            <CardDescription className="text-[11px] text-slate-400">List of previously sent WhatsApp campaign dispatches.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {campaigns.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center justify-center gap-2">
                <History className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-700">No campaigns launched yet</p>
                <p className="text-xs text-slate-400">Compose and launch WhatsApp broadcasts in the campaign tab.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-150 bg-slate-50/30">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-6">Campaign Info</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Message</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipients</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Sent</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(camp => (
                    <TableRow key={camp.id} className="hover:bg-slate-50/40 border-slate-100">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <Megaphone className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-850 text-slate-800 leading-tight">{camp.name}</p>
                            <p className="text-[9px] font-medium text-slate-400 mt-0.5 font-mono">ID: {camp.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-slate-500 truncate">{camp.message}</TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">{camp.recipientsCount} recipient(s)</TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">{camp.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 inline-flex items-center">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          {camp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
