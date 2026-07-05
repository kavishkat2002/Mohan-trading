import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Users, Loader2, 
  Wallet, Landmark, Receipt, TrendingUp, TrendingDown, PieChart, AlertCircle, 
  MoreHorizontal, Pencil, Trash2, FileText, Download, Briefcase,
  RotateCcw, AlertTriangle, Send, Bot, User, Sparkles,
  Plus, MessageSquare, PanelLeftOpen, PanelLeftClose
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/hooks/useBusiness";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { business } = useBusiness();
  const isElevated = user?.role === 'owner' || user?.role === 'admin';
  const canEditLedger = user?.role === 'owner' || user?.role === 'accountant' || user?.role === 'admin';
  const [activeTab, setActiveTab] = useState("overview");

  // Reset dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);


  // State for all data
  const [overview, setOverview] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  
  // UI toggles
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [isAddingSale, setIsAddingSale] = useState(false);
  
  // Forms
  const [newExpense, setNewExpense] = useState({
    category: "Fuel", amount: "", description: "", date: new Date().toISOString().split('T')[0], account: "Cash"
  });

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newSale, setNewSale] = useState({
    vehicle_id: "", lead_id: "", selling_price: "", sale_date: new Date().toISOString().split('T')[0], account: "Bank",
    customer_name: "", customer_phone: "", customer_address: ""
  });

  type ChatMessage = { role: string; content: string };
  type ChatSession = { id: string; title: string; messages: ChatMessage[] };

  const [showChatModal, setShowChatModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const savedSessions = localStorage.getItem('finai_sessions');
    if (savedSessions) return JSON.parse(savedSessions);
    
    // Migration from old single chat
    const oldChat = localStorage.getItem('finai_chat');
    if (oldChat) {
      return [{ id: 'migrated', title: 'Previous Chat', messages: JSON.parse(oldChat) }];
    }
    return [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const savedSessions = localStorage.getItem('finai_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      if (parsed.length > 0) return parsed[0].id;
    }
    // Migration
    const oldChat = localStorage.getItem('finai_chat');
    if (oldChat) return 'migrated';
    return null;
  });

  useEffect(() => {
    localStorage.setItem('finai_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Derived state for the active chat window
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const chatMessages = activeSession ? activeSession.messages : [{ role: 'ai', content: 'Hello! I am your Financial AI. Ask me about your P&L, expenses, or sales trends.' }];

  const createNewChat = () => {
    const newId = Date.now().toString();
    setSessions([{ id: newId, title: 'New Chat', messages: [{ role: 'ai', content: 'Hello! I am your Financial AI. Ask me about your P&L, expenses, or sales trends.' }] }, ...sessions]);
    setActiveSessionId(newId);
    if (window.innerWidth < 640) setShowSidebar(false);
  };

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [aiInsights, setAiInsights] = useState<{trend: string, health: string} | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      setInsightsLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}/api/finance/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: 'Provide a quick 1-sentence trend prediction and 1-sentence financial health check based on the data. Reply ONLY with a raw JSON object (no markdown, no backticks) in this exact format: {"trend": "...", "health": "..."}',
            history: []
          })
        });
        const data = await res.json();
        try {
          const cleanJson = data.reply.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          setAiInsights(parsed);
        } catch (e) {
           console.error("Failed to parse AI insights:", data.reply);
           setAiInsights({
             trend: "Unable to load prediction at this time.",
             health: "Unable to load health check at this time."
           });
        }
      } catch (err) {
        console.error("Failed to fetch insights", err);
      } finally {
        setInsightsLoading(false);
      }
    };
    fetchInsights();
  }, []);

  const askAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    
    const userMsg = chatInput;
    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      currentSessions.unshift({ id: currentSessionId, title: userMsg.slice(0, 30) + (userMsg.length > 30 ? '...' : ''), messages: [{ role: 'ai', content: 'Hello! I am your Financial AI. Ask me about your P&L, expenses, or sales trends.' }] });
      setActiveSessionId(currentSessionId);
    } else {
      const session = currentSessions.find(s => s.id === currentSessionId);
      if (session && session.messages.length === 1 && session.title === 'New Chat') {
        session.title = userMsg.slice(0, 30) + (userMsg.length > 30 ? '...' : '');
      }
    }

    const sessionIndex = currentSessions.findIndex(s => s.id === currentSessionId);
    const newHistory = [...currentSessions[sessionIndex].messages, { role: 'user', content: userMsg }];
    currentSessions[sessionIndex].messages = newHistory;
    setSessions(currentSessions);
    
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}/api/finance/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          history: newHistory.filter(m => m.content !== 'Hello! I am your Financial AI. Ask me about your P&L, expenses, or sales trends.')
        })
      });
      const data = await res.json();
      
      setSessions(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(s => s.id === currentSessionId);
        if (idx !== -1) {
          updated[idx].messages = [...updated[idx].messages, { role: 'ai', content: data.reply || "Error fetching response." }];
        }
        return updated;
      });
    } catch (err) {
      setSessions(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(s => s.id === currentSessionId);
        if (idx !== -1) {
          updated[idx].messages = [...updated[idx].messages, { role: 'ai', content: "Sorry, I couldn't connect to the server." }];
        }
        return updated;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'monthly'>('daily');
  const [globalMonthFilter, setGlobalMonthFilter] = useState<string>('all');

  const availableMonths = Array.from(new Set([
    ...sales.map(s => s.sale_date?.substring(0, 7)).filter(Boolean),
    ...expenses.map(e => e.date?.substring(0, 7)).filter(Boolean)
  ])).sort().reverse() as string[];

  const filteredSales = sales.filter(s => {
    if (globalMonthFilter === 'all') return true;
    return s.sale_date && s.sale_date.startsWith(globalMonthFilter);
  });

  const filteredExpenses = expenses.filter(e => {
    if (globalMonthFilter === 'all') return true;
    return e.date && e.date.startsWith(globalMonthFilter);
  });

  const filteredTotalSales = filteredSales.reduce((sum, s) => sum + (Number(s.selling_price) || 0), 0);
  const filteredTotalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const filteredCostOfGoods = filteredSales.reduce((acc, s) => acc + ((Number(s.purchase_price)||0) + (Number(s.repair_cost)||0) + (Number(s.transport_cost)||0) + (Number(s.registration_fee)||0)), 0);
  const filteredNetProfit = filteredTotalSales - filteredCostOfGoods - filteredTotalExpenses;

  // Generate chart data from sales and expenses
  const generateChartData = () => {
    const dataMap: Record<string, { date: string; Income: number; Expenses: number }> = {};

    const getKey = (dateStr: string | null) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      if (chartTimeframe === 'monthly') {
        return d.toISOString().slice(0, 7); // "YYYY-MM"
      }
      return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
    };

    filteredSales.forEach(s => {
      const d = getKey(s.sale_date);
      if (!d) return;
      if (!dataMap[d]) dataMap[d] = { date: d, Income: 0, Expenses: 0 };
      dataMap[d].Income += Number(s.selling_price) || 0;
    });

    filteredExpenses.forEach(e => {
      const d = getKey(e.date);
      if (!d) return;
      if (!dataMap[d]) dataMap[d] = { date: d, Income: 0, Expenses: 0 };
      dataMap[d].Expenses += Number(e.amount) || 0;
    });

    return Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overRes, expRes, salesRes, vehRes, leadRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/overview`),
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/expenses`),
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/sales`),
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/vehicles`),
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/leads`)
      ]);
      setOverview(await overRes.json());
      setExpenses(await expRes.json());
      setSales(await salesRes.json());
      setVehicles(await vehRes.json());
      const allLeads = await leadRes.json();
      setLeads(allLeads.filter((l: any) => {
        const s = (l.status || '').toLowerCase();
        return s !== 'closed' && s !== 'closed deal';
      }));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh when window gets focus (e.g. user comes back from Vehicles page)
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleResetFinancialData = async () => {
    if (resetConfirmText !== 'RESET') return;
    setIsResetting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}/api/finance/reset`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_FINANCIAL_DATA' })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: '✅ Financial data reset', description: 'All sales, expenses and cash flow records have been cleared.' });
        setShowResetDialog(false);
        setResetConfirmText('');
        fetchData();
      } else {
        toast({ title: 'Reset failed', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Network error', variant: 'destructive' });
    }
    setIsResetting(false);
  };


  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingExpenseId 
        ? `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/expenses/${editingExpenseId}`
        : `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/expenses`;
      const method = editingExpenseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExpense)
      });
      if (res.ok) {
        toast({ title: editingExpenseId ? "Expense Updated" : "Expense Added", description: "Ledger updated successfully." });
        setIsAddingExpense(false);
        setEditingExpenseId(null);
        setNewExpense({ category: "Fuel", amount: "", description: "", date: new Date().toISOString().split('T')[0], account: "Cash" });
        fetchData();
      } else {
        const errData = await res.json().catch(() => null);
        toast({ title: "Failed to Save Expense", description: errData?.error || "Server error", variant: "destructive" });
      }
    } catch (err: any) { 
        toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEditExpenseClick = (exp: any) => {
    setNewExpense({
      category: exp.category || "Fuel",
      amount: exp.amount || "",
      description: exp.description || "",
      date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      account: "Cash"
    });
    setEditingExpenseId(exp.id);
    setIsAddingExpense(true);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense? This will also remove the corresponding cash flow entry.")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Expense deleted" });
        fetchData();
      } else {
        toast({ title: "Failed to delete expense", variant: "destructive" });
      }
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newSale.vehicle_id) {
         return toast({ title: "Missing Information", description: "Please select a vehicle to sell.", variant: "destructive" });
      }
      
      if (isNewCustomer) {
        if (!newSale.customer_name || !newSale.customer_phone) {
           return toast({ title: "Missing Information", description: "Please enter the new customer's name and phone.", variant: "destructive" });
        }
      } else {
        if (!newSale.lead_id) {
           return toast({ title: "Missing Information", description: "Please select a linked customer lead.", variant: "destructive" });
        }
      }

      const payload = {
        ...newSale,
        payment_method: newSale.account,
        is_new_customer: isNewCustomer
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: "Sale Recorded", description: "Vehicle marked as sold and cash flow updated." });
        setIsAddingSale(false);
        setIsNewCustomer(false);
        setNewSale({ 
          vehicle_id: "", lead_id: "", selling_price: "", sale_date: new Date().toISOString().split('T')[0], account: "Bank",
          customer_name: "", customer_phone: "", customer_address: "" 
        });
        fetchData();
      } else {
        const errData = await res.json().catch(() => null);
        toast({ title: "Failed to Record Sale", description: errData?.error || "Server error", variant: "destructive" });
      }
    } catch (err: any) { 
        toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteSale = async (id: number) => {
    if (!window.confirm('Delete this sale record? This will restore vehicle stock and revert the lead status.')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}/api/finance/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Sale Deleted', description: 'Record removed. Vehicle stock and lead status restored.' });
        fetchData();
      } else {
        toast({ title: 'Failed to delete', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Network error', variant: 'destructive' });
    }
  };

  const cashBalance = overview?.balances?.find((b: any) => b.account === 'Cash')?.balance || 0;
  const bankBalance = overview?.balances?.find((b: any) => b.account === 'Bank')?.balance || 0;

  const handleExportAudit = async () => {
    // Rely on native browser print engine with print modifiers
    window.print();
    setTimeout(() => {
      toast({ title: "Audit Prepared for PDF Export", description: "Use the browser dialog to Save as PDF." });
    }, 500);
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground tracking-tight">Mohan Trading Finance</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Accounting, Profit Analysis & Inventory tracking.</p>
        </div>
        <div className="flex gap-2">
           <Select value={globalMonthFilter} onValueChange={setGlobalMonthFilter}>
             <SelectTrigger className="w-[140px] h-10 text-xs font-semibold bg-background border-border">
               <SelectValue placeholder="All Time" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Time</SelectItem>
               {availableMonths.map(m => {
                 const [year, month] = m.split('-');
                 const dateObj = new Date(parseInt(year), parseInt(month) - 1);
                 return (
                   <SelectItem key={m} value={m}>
                     {dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                   </SelectItem>
                 );
               })}
             </SelectContent>
           </Select>

           {isElevated && (
             <Button
               size="sm"
               variant="outline"
               className="h-10 text-xs px-4 border-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-400"
               onClick={() => { setResetConfirmText(''); setShowResetDialog(true); }}
             >
               <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Data
             </Button>
           )}
           <Button size="sm" className="h-10 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 shadow-sm" onClick={() => setShowChatModal(true)}>
             <Bot className="mr-1.5 h-3.5 w-3.5" /> FinAI
           </Button>
           <Button size="sm" className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4" onClick={() => setIsAddingSale(true)}>
             <Wallet className="mr-2 h-3.5 w-3.5" /> New Sale
           </Button>
           <Button size="sm" variant="secondary" className="h-10 text-xs px-4" onClick={() => setIsAddingExpense(true)}>
             <Receipt className="mr-2 h-3.5 w-3.5" /> Log Expense
           </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6 print:space-y-0" onValueChange={v => setActiveTab(v)}>
        <TabsList className="bg-muted p-1 rounded-xl h-11 print:hidden">
          <TabsTrigger value="overview" className="text-xs px-6 rounded-lg data-[state=active]:shadow-md">Dashboard</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs px-6 rounded-lg data-[state=active]:shadow-md">Sales Tracking</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs px-6 rounded-lg data-[state=active]:shadow-md">Stock Value</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs px-6 rounded-lg data-[state=active]:shadow-md">Daily Ledger</TabsTrigger>
          <TabsTrigger value="pnl" className="text-xs px-6 rounded-lg data-[state=active]:shadow-md font-bold text-emerald-600">P&L Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-2 border-emerald-50 shadow-sm border-l-4 border-l-emerald-500 overflow-hidden">
              <CardContent className="pt-6 relative">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{globalMonthFilter === 'all' ? 'Total' : 'Monthly'} Sales Vol</p>
                <h3 className="text-2xl font-black mt-2 text-foreground">Rs. {filteredTotalSales.toLocaleString()}</h3>
                <TrendingUp className="h-12 w-12 text-emerald-500/10 absolute -right-2 -bottom-2" />
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-rose-50 shadow-sm border-l-4 border-l-rose-500 overflow-hidden">
              <CardContent className="pt-6 relative">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{globalMonthFilter === 'all' ? 'Total' : 'Monthly'} Expenses</p>
                <h3 className="text-2xl font-black mt-2 text-foreground">Rs. {filteredTotalExpenses.toLocaleString()}</h3>
                <TrendingDown className="h-12 w-12 text-rose-500/10 absolute -right-2 -bottom-2" />
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-blue-50 shadow-sm border-l-4 border-l-blue-500 overflow-hidden">
              <CardContent className="pt-6 relative">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Cash</p>
                <h3 className="text-2xl font-black mt-2 text-foreground">Rs. {Number(cashBalance).toLocaleString()}</h3>
                <Wallet className="h-12 w-12 text-blue-500/10 absolute -right-2 -bottom-2" />
                {cashBalance < 50000 && (
                  <Badge variant="destructive" className="mt-2 text-[9px] h-4">Low Cash Balance</Badge>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-amber-50 shadow-sm border-l-4 border-l-amber-500 overflow-hidden">
              <CardContent className="pt-6 relative">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bank Holdings</p>
                <h3 className="text-2xl font-black mt-2 text-foreground">Rs. {Number(bankBalance).toLocaleString()}</h3>
                <Landmark className="h-12 w-12 text-amber-500/10 absolute -right-2 -bottom-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                   <CardTitle className="text-lg">Recent Cash Flow Statement</CardTitle>
                   <CardDescription>Visualizing ins and outs across all accounts.</CardDescription>
                </div>
                <div className="flex bg-muted/50 p-1 rounded-md">
                   <button 
                     onClick={() => setChartTimeframe('daily')}
                     className={`px-3 py-1 text-xs rounded transition-all ${chartTimeframe === 'daily' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                   >Daily</button>
                   <button 
                     onClick={() => setChartTimeframe('monthly')}
                     className={`px-3 py-1 text-xs rounded transition-all ${chartTimeframe === 'monthly' ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                   >Monthly</button>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="h-[250px] mt-2">
                    {generateChartData().length === 0 ? (
                      <div className="h-full flex items-center justify-center border-t border-dashed bg-muted/20 rounded-xl">
                        <div className="text-center group cursor-pointer">
                           <PieChart className="h-10 w-10 text-muted-foreground/20 mx-auto group-hover:text-primary/40 transition-colors" />
                           <p className="text-xs text-muted-foreground mt-2 italic">No cash flow data available.</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={generateChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 10}} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => {
                              const date = new Date(val);
                              if (isNaN(date.getTime())) return val;
                              if (chartTimeframe === 'monthly') {
                                return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
                              }
                              return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                            }} 
                          />
                          <YAxis width={75} tick={{fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => `Rs. ${(val / 1000000).toFixed(1)}M`} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}
                            formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, undefined]}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              if (isNaN(date.getTime())) return label;
                              if (chartTimeframe === 'monthly') {
                                return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                              }
                              return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                            }}
                          />
                          <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                          <Area type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                 </div>
              </CardContent>
            </Card>

            {/* AI Insights Card */}
            <Card className="border-border shadow-sm flex flex-col relative overflow-hidden">
              <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
                <Bot className="h-32 w-32" />
              </div>
              <CardHeader className="pb-3 border-b bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                  AI Insights
                </CardTitle>
                <CardDescription>Automated financial analysis & prediction.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-5 text-sm space-y-4">
                {insightsLoading || !aiInsights ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="bg-muted/50 h-24 rounded-lg w-full"></div>
                    <div className="bg-muted/50 h-24 rounded-lg w-full"></div>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                      <h4 className="font-semibold text-primary mb-1 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Trend Prediction</h4>
                      <p className="text-muted-foreground leading-relaxed">{aiInsights.trend}</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                      <h4 className="font-semibold text-amber-600 mb-1 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Financial Health</h4>
                      <p className="text-muted-foreground leading-relaxed">{aiInsights.health}</p>
                    </div>
                  </>
                )}
                
                <div className="pt-2">
                  <Button className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setShowChatModal(true)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-2" /> Ask FinAI for details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales">
           <Card className="border-border shadow-sm overflow-hidden">
             <CardHeader className="bg-primary/5 border-b">
               <CardTitle className="text-lg flex items-center gap-2">
                 <Briefcase className="h-5 w-5 text-primary" /> Vehicle Sale Ledger
               </CardTitle>
               <CardDescription>Tracking cost structure vs final selling figures per unit.</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-muted/50">
                   <TableRow>
                     <TableHead className="text-xs uppercase font-bold py-4 pl-6">Car Model</TableHead>
                     <TableHead className="text-xs uppercase font-mono py-4">Total Cost</TableHead>
                     <TableHead className="text-xs uppercase py-4">Sale Price</TableHead>
                     <TableHead className="text-xs uppercase py-4">Profit</TableHead>
                     <TableHead className="text-xs uppercase py-4">Margin %</TableHead>
                     <TableHead className="text-xs uppercase py-4">Date</TableHead>
                     <TableHead className="text-xs uppercase py-4">Payment</TableHead>
                     {isElevated && <TableHead className="text-xs uppercase text-right py-4 pr-6">Action</TableHead>}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {sales.length === 0 ? (
                      <TableRow><TableCell colSpan={isElevated ? 8 : 7} className="text-center py-20 text-muted-foreground bg-muted/5">No finalized sales in current period.</TableCell></TableRow>
                   ) : (
                     filteredSales.map(s => {
                       const totalCost = Number(s.purchase_price) + Number(s.transport_cost) + Number(s.repair_cost) + Number(s.registration_fee);
                       const profit = Number(s.selling_price) - totalCost;
                       const margin = ((profit / Number(s.selling_price)) * 100).toFixed(1);
                       return (
                         <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                           <TableCell className="text-sm font-semibold pl-6">{s.brand}</TableCell>
                           <TableCell className="text-sm font-mono text-muted-foreground">Rs. {totalCost.toLocaleString()}</TableCell>
                           <TableCell className="text-sm font-bold text-foreground">Rs. {Number(s.selling_price).toLocaleString()}</TableCell>
                           <TableCell className="text-sm font-bold text-emerald-600">Rs. {profit.toLocaleString()}</TableCell>
                           <TableCell>
                             <Badge className="text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-800 border-emerald-200">
                               +{margin}%
                             </Badge>
                           </TableCell>
                           <TableCell className="text-xs text-muted-foreground font-mono">
                             {s.sale_date ? new Date(s.sale_date).toLocaleDateString('en-GB') : '—'}
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline" className="text-[9px] font-bold uppercase">
                               {s.payment_method || 'Bank'}
                             </Badge>
                           </TableCell>
                           {isElevated && (
                             <TableCell className="text-right pr-6">
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                 onClick={() => handleDeleteSale(s.id)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </TableCell>
                           )}
                         </TableRow>
                       )
                     })
                   )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
           <Card className="border-border shadow-md">
              <CardHeader>
                 <CardTitle>Inventory Financial Valuation</CardTitle>
                 <CardDescription>Total capital tied up in vehicle stock including repairs and logistics.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border">
                       <p className="text-[10px] uppercase font-bold text-muted-foreground mr-auto">Total Stock Value</p>
                       <p className="text-xl font-black mt-1">Rs. {vehicles.reduce((acc, v) => acc + (Number(v.purchase_price) * v.stock), 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/40 border border-border">
                       <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Repair Investment</p>
                       <p className="text-xl font-black mt-1">Rs. {vehicles.reduce((acc, v) => acc + (Number(v.repair_cost) * v.stock), 0).toLocaleString()}</p>
                    </div>
                 </div>
                 <Table>
                    <TableHeader>
                       <TableRow>
                          <TableHead className="text-xs uppercase">Vehicle</TableHead>
                          <TableHead className="text-xs uppercase">Purchase</TableHead>
                          <TableHead className="text-xs uppercase">Repairs</TableHead>
                          <TableHead className="text-xs uppercase">Taxes/Other</TableHead>
                          <TableHead className="text-xs uppercase text-right">Unit Net Cost</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {vehicles.map(v => {
                          const unitCost = Number(v.purchase_price) + Number(v.repair_cost) + Number(v.transport_cost) + Number(v.registration_fee);
                          return (
                             <TableRow key={v.id}>
                                <TableCell className="text-sm font-medium">{v.brand}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">Rs. {Number(v.purchase_price).toLocaleString()}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">Rs. {Number(v.repair_cost).toLocaleString()}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">Rs. {(Number(v.transport_cost) + Number(v.registration_fee)).toLocaleString()}</TableCell>
                                <TableCell className="text-sm text-right font-bold">Rs. {unitCost.toLocaleString()}</TableCell>
                             </TableRow>
                          )
                       })}
                    </TableBody>
                 </Table>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="ledger">
           <Card className="border-border shadow-sm">
             <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
                <div>
                  <CardTitle className="text-lg">Business Daily Ledger</CardTitle>
                  <CardDescription>All non-vehicle operational expenses.</CardDescription>
                </div>
             </CardHeader>
             <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-muted/30">
                   <TableRow>
                     <TableHead className="text-xs uppercase font-bold py-4 pl-6">Date</TableHead>
                     <TableHead className="text-xs uppercase font-bold py-4">Category</TableHead>
                     <TableHead className="text-xs uppercase font-bold py-4">Description</TableHead>
                     <TableHead className="text-xs uppercase font-bold py-4 text-right pr-6">Amount</TableHead>
                     {canEditLedger && <TableHead className="text-xs uppercase font-bold py-4 text-right pr-6">Action</TableHead>}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {expenses.length === 0 ? (
                      <TableRow><TableCell colSpan={canEditLedger ? 5 : 4} className="text-center py-20 text-muted-foreground">No operational overhead logged.</TableCell></TableRow>
                   ) : (
                     filteredExpenses.map(e => (
                       <TableRow key={e.id} className="hover:bg-muted/10 transition-colors">
                         <TableCell className="text-xs text-muted-foreground pl-6 font-mono">{new Date(e.date).toLocaleDateString('en-GB')}</TableCell>
                         <TableCell>
                           <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter rounded-sm px-1.5 ${
                             e.category === 'Salary' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                           }`}>
                             {e.category}
                           </Badge>
                         </TableCell>
                         <TableCell className="text-sm text-foreground/80">{e.description}</TableCell>
                         <TableCell className="text-right pr-6 font-black text-rose-600 font-mono">
                           - Rs. {Number(e.amount).toLocaleString()}
                         </TableCell>
                         {canEditLedger && (
                            <TableCell className="text-right pr-6">
                               <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => handleEditExpenseClick(e)}>
                                     <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteExpense(e.id)}>
                                     <Trash2 className="h-4 w-4" />
                                  </Button>
                               </div>
                            </TableCell>
                         )}
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="pnl" className="print:m-0 print:p-0">
           {/* Custom Print Header just for the PDF export */}
           <div className="hidden print:flex w-full items-center gap-6 border-b-4 border-emerald-950 pb-6 mb-8 mt-10 px-8">
               <img 
                 src={business?.logo_url ? `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`}${business.logo_url.replace(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001`}`, '')}` : "/mohantrader-logo.png"} 
                 className="w-24 h-24 object-contain rounded-xl shadow-lg border bg-white" 
                 alt="Logo" 
                 onError={(e) => { e.currentTarget.src = "/mohantrader-logo.png"; }} 
               />
              <div className="flex flex-col">
                 <h1 className="text-4xl font-black font-logo uppercase text-emerald-950 tracking-widest">{business?.name || "Mohan Trading"}</h1>
                 <p className="text-xl text-emerald-800 font-medium italic mt-2">{business?.slogan || "Delivering Dreams, Driving Trust"}</p>
                 <Badge className="w-fit mt-3 bg-emerald-100 text-emerald-900 border-emerald-200">Official Financial Audit Report - {new Date().toLocaleDateString()}</Badge>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block print:w-full print:px-8">
              <Card className="border-emerald-200 border-2 shadow-md bg-emerald-50/30 min-h-[400px] print:shadow-none print:border print:border-emerald-200">
                <CardHeader className="border-b print:border-black/10">
                   <CardTitle className="flex items-center gap-3">
                     <FileText className="h-6 w-6 text-emerald-600 print:text-black" /> Professional P&L Report
                   </CardTitle>
                   <CardDescription>Consolidated Statement for Fiscal Period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-muted-foreground">Total Income (Gross Sales)</span>
                    <div className="text-right">
                      <span className="text-lg font-black font-mono">Rs. {filteredTotalSales.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 text-rose-600/80">
                    <span className="text-sm font-medium">Cost of Vehicles Sold (COGS)</span>
                    <span className="text-sm font-bold font-mono">- Rs. {filteredCostOfGoods.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-rose-600/80">
                    <span className="text-sm font-medium">Total Operating Expenses</span>
                    <span className="text-sm font-bold font-mono text-rose-600 print:text-rose-700">- Rs. {filteredTotalExpenses.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center py-4 mt-2 border-t-2 border-border/50">
                    <span className="text-base font-bold text-foreground">Net Operating Profit</span>
                    <span className={`text-xl font-black font-mono ${filteredNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           Rs. {filteredNetProfit.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right uppercase tracking-widest mt-2">Calculated in real-time based on validated ledger entries</p>
                   
                   <Button onClick={handleExportAudit} size="lg" className="w-full mt-6 bg-emerald-600 text-white font-black hover:bg-emerald-700 hover:scale-[1.01] transition-all flex gap-3 outline-none print:hidden">
                      <Download className="h-4 w-4" /> Export Professional Audit PDF
                   </Button>
                </CardContent>
              </Card>

              {/* Print Only Table Extension */}
              <div className="hidden print:block col-span-2 pt-10">
                <h3 className="font-bold text-lg border-b pb-2 mb-4">Detailed Vehicle Sale Logs</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Purch+Rep+Tax</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead className="text-right">Net Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.slice(0, 15).map(s => {
                       const scost = Number(s.purchase_price) + Number(s.repair_cost) + Number(s.transport_cost) + Number(s.registration_fee);
                       return (
                         <TableRow key={s.id}>
                           <TableCell className="font-semibold">{s.brand}</TableCell>
                           <TableCell className="text-muted-foreground font-mono">Rs. {scost.toLocaleString()}</TableCell>
                           <TableCell className="font-bold font-mono">Rs. {Number(s.selling_price).toLocaleString()}</TableCell>
                           <TableCell className="text-right font-black text-emerald-600 font-mono">Rs. {(Number(s.selling_price) - scost).toLocaleString()}</TableCell>
                         </TableRow>
                       )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-6 print:hidden">
                 <Card className="border-border shadow-sm bg-background">
                    <CardHeader className="pb-3">
                       <CardTitle className="text-sm">Compliance & Tax Control</CardTitle>
                       <CardDescription className="text-[11px]">Sri Lanka context (SVAT/VAT tracking placeholder)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <div className="flex flex-col">
                             <span className="text-xs font-bold">Standard Income Verification</span>
                             <span className="text-[10px] text-muted-foreground">All transactions recorded with audit trails</span>
                          </div>
                       </div>
                       <Button variant="outline" className="w-full text-xs font-bold border-2 h-10">Export Auditor Reports</Button>
                    </CardContent>
                 </Card>

                 <Card className="border-border shadow-sm">
                    <CardHeader>
                       <CardTitle className="text-base">Financial Alerts Log</CardTitle>
                       <CardDescription>High expense spikes and low profit warnings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                       {overview?.totalExpenses > 100000 && (
                         <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-100 flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="flex flex-col">
                               <span className="text-xs font-bold">High Expense Spike Recorded</span>
                               <span className="text-[10px] opacity-80">Monthly operational costs exceeded Rs. 100,000 threshold.</span>
                            </div>
                         </div>
                       )}
                       <p className="text-[11px] text-muted-foreground text-center py-4 italic">No other critical alerts at this moment.</p>
                    </CardContent>
                 </Card>
              </div>
           </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: LOG SALE */}
      {isAddingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex justify-center items-center p-4">
           <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black font-display tracking-tight">Finalize Vehicle Sale</h2>
                 <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full" onClick={() => setIsAddingSale(false)}>&times;</Button>
              </div>
              
              <form onSubmit={handleAddSale} className="space-y-5">
                 <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Select Vehicle From Stock</Label>
                    <Select value={newSale.vehicle_id} onValueChange={v => setNewSale({...newSale, vehicle_id: v})}>
                       <SelectTrigger className="h-11 border-2 focus:border-primary"><SelectValue placeholder="Which car was sold?" /></SelectTrigger>
                       <SelectContent>
                          {vehicles.filter(v => v.stock > 0).map(v => (
                             <SelectItem key={v.id} value={v.id.toString()}>{v.brand} - Rs. {Number(v.price).toLocaleString()}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <Label className="text-xs uppercase font-bold text-muted-foreground">Select Buyer (Lead)</Label>
                       <div className="flex items-center gap-2">
                          <input type="checkbox" id="new-customer-toggle" className="rounded" checked={isNewCustomer} onChange={e => setIsNewCustomer(e.target.checked)} />
                          <label htmlFor="new-customer-toggle" className="text-xs font-semibold text-primary cursor-pointer">Buyer not in leads?</label>
                       </div>
                    </div>

                    {!isNewCustomer ? (
                       <Select value={newSale.lead_id} onValueChange={v => setNewSale({...newSale, lead_id: v})}>
                          <SelectTrigger className="h-11 border-2"><SelectValue placeholder="Who bought it?" /></SelectTrigger>
                          <SelectContent>
                             {leads.map(l => (
                                <SelectItem key={l.id} value={l.id.toString()}>{l.name} ({l.phone})</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    ) : (
                       <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                          <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Name</Label>
                             <Input className="h-10 border-2" placeholder="John Doe" value={newSale.customer_name} onChange={e => setNewSale({...newSale, customer_name: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Phone Number</Label>
                             <Input className="h-10 border-2" placeholder="077..." value={newSale.customer_phone} onChange={e => setNewSale({...newSale, customer_phone: e.target.value})} />
                          </div>
                          <div className="space-y-2 col-span-2">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Address (Optional)</Label>
                             <Input className="h-10 border-2" placeholder="123 Main St..." value={newSale.customer_address} onChange={e => setNewSale({...newSale, customer_address: e.target.value})} />
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs uppercase font-bold text-muted-foreground">Final Selling Price (Rs.)</Label>
                       <Input required type="number" className="h-11 border-2" value={newSale.selling_price} onChange={e => setNewSale({...newSale, selling_price: e.target.value})} placeholder="7250000" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs uppercase font-bold text-muted-foreground">Deposit Account</Label>
                       <Select value={newSale.account} onValueChange={v => setNewSale({...newSale, account: v})}>
                          <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="Bank">Bank Account</SelectItem>
                             <SelectItem value="Cash">Cash Drawer</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="pt-6 flex gap-3">
                    <Button type="submit" className="flex-1 h-12 bg-primary text-white font-black rounded-xl">Generate Invoice & Close Deal</Button>
                    <Button type="button" variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setIsAddingSale(false)}>Cancel</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* MODAL: LOG EXPENSE */}
      {isAddingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex justify-center items-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black font-display tracking-tight">{editingExpenseId ? "Edit Business Expense" : "Record Business Expense"}</h2>
                <Button variant="ghost" size="icon" onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }}>&times;</Button>
             </div>
             
             <form onSubmit={handleSaveExpense} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Category</Label>
                      <Select value={newExpense.category} onValueChange={v => setNewExpense({...newExpense, category: v})}>
                        <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Fuel">Fuel</SelectItem>
                           <SelectItem value="Salary">Staff Salary</SelectItem>
                           <SelectItem value="Marketing">Marketing</SelectItem>
                           <SelectItem value="Maintenance">Maintenance</SelectItem>
                           <SelectItem value="Utility">Utility Bills</SelectItem>
                           <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Amount (Rs.)</Label>
                      <Input required type="number" className="h-11 border-2" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                   </div>
                </div>

                <div className="space-y-2">
                   <Label className="text-xs uppercase font-bold text-muted-foreground">Expense Description</Label>
                   <Input value={newExpense.description} className="h-11 border-2" onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Description of expenditure..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Paid From</Label>
                      <Select value={newExpense.account} onValueChange={v => setNewExpense({...newExpense, account: v})}>
                        <SelectTrigger className="h-11 border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Cash">Cash in Hand</SelectItem>
                           <SelectItem value="Bank">Bank Account</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Date</Label>
                      <Input type="date" className="h-11 border-2" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                   </div>
                </div>

                <div className="pt-6 flex gap-3">
                   <Button type="submit" className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl">{editingExpenseId ? "Update Expense" : "Post to Daily Ledger"}</Button>
                   <Button type="button" variant="outline" className="h-12 px-6 rounded-xl" onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }}>Cancel</Button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* ── Reset Financial Data Confirmation Dialog ── */}
      <Dialog open={showResetDialog} onOpenChange={(o) => { setShowResetDialog(o); setResetConfirmText(''); }}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-rose-50 border-b border-rose-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-rose-700 font-bold text-lg">Reset Financial Data</DialogTitle>
                <DialogDescription className="text-rose-600/70 text-xs mt-0.5">
                  This action is permanent and cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-1.5">
              <p className="text-sm font-semibold text-rose-800">The following data will be permanently deleted:</p>
              <ul className="text-xs text-rose-700 space-y-1 mt-2 list-disc list-inside">
                <li>All vehicle sales records</li>
                <li>All expense entries</li>
                <li>All cash flow transactions</li>
                <li>Vehicle stock will be restored</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-rose-600">RESET</span> to confirm
              </Label>
              <Input
                value={resetConfirmText}
                onChange={e => setResetConfirmText(e.target.value)}
                placeholder="Type RESET here..."
                className="h-11 border-2 font-mono text-center tracking-widest text-rose-600 border-rose-200 focus:border-rose-400"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 border-2"
              onClick={() => { setShowResetDialog(false); setResetConfirmText(''); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={resetConfirmText !== 'RESET' || isResetting}
              onClick={handleResetFinancialData}
            >
              {isResetting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
              ) : (
                <><RotateCcw className="mr-2 h-4 w-4" /> Reset All Data</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Financial Analyst Chatbot Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex flex-col sm:flex-row h-[600px] border-border shadow-lg">
          
          {/* History Sidebar */}
          <div className={`bg-muted/20 flex flex-col transition-all duration-300 ${showSidebar ? 'w-64 border-r' : 'w-0 border-r-0'} overflow-hidden shrink-0 absolute sm:relative h-full z-10 backdrop-blur-md sm:backdrop-blur-none`}>
            <div className="p-4 border-b flex items-center justify-between min-w-[256px]">
              <h3 className="font-semibold text-sm">Chat History</h3>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={createNewChat} title="New Chat">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 sm:hidden" onClick={() => setShowSidebar(false)}>
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-w-[256px]">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); if (window.innerWidth < 640) setShowSidebar(false); }}
                  className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 truncate ${activeSessionId === s.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <DialogHeader className="py-3 px-4 pr-10 border-b bg-muted/10 flex flex-row items-center justify-between shrink-0 h-14">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowSidebar(!showSidebar)}>
                  {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </Button>
                <DialogTitle className="text-base text-primary flex items-center gap-2 m-0">
                   <Bot className="h-5 w-5" /> FinAI
                </DialogTitle>
                <DialogDescription className="sr-only">Ask questions about your live P&L data.</DialogDescription>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={createNewChat}>
                <Plus className="h-3.5 w-3.5" /> New Chat
              </Button>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background">
               {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 text-sm ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                     {msg.role === 'ai' && (
                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                         <Bot className="h-4 w-4 text-primary" />
                       </div>
                     )}
                     <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === 'ai' ? 'bg-muted/50 rounded-tl-none border border-border/50 text-foreground' : 'bg-primary text-white rounded-tr-none'}`}>
                        {msg.content}
                     </div>
                  </div>
               ))}
               {isTyping && (
                  <div className="flex gap-3 text-sm justify-start">
                     <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                       <Bot className="h-4 w-4 text-primary" />
                     </div>
                     <div className="p-4 rounded-2xl bg-muted/50 rounded-tl-none border border-border/50 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-200" />
                     </div>
                  </div>
               )}
            </div>
            <div className="p-4 border-t bg-background mt-auto shrink-0">
               <form onSubmit={askAI} className="flex gap-2">
                  <Input 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask about your expenses..."
                    className="bg-muted/30 border-border/50 focus-visible:ring-primary/20 h-10"
                  />
                  <Button type="submit" disabled={isTyping || !chatInput.trim()} size="icon" className="shrink-0 bg-primary hover:bg-primary/90 text-white shadow-sm h-10 w-10">
                    <Send className="h-4 w-4" />
                  </Button>
               </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
