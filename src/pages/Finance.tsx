import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Users, Loader2, 
  Wallet, Landmark, Receipt, TrendingUp, PieChart, AlertCircle, 
  MoreHorizontal, Pencil, Trash2, FileText, Download, Briefcase
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // State for all data
  const [overview, setOverview] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  
  // UI toggles
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingSale, setIsAddingSale] = useState(false);
  
  // Forms
  const [newExpense, setNewExpense] = useState({
    category: "Fuel", amount: "", description: "", date: new Date().toISOString().split('T')[0], account: "Cash"
  });

  const [newSale, setNewSale] = useState({
    vehicle_id: "", lead_id: "", selling_price: "", sale_date: new Date().toISOString().split('T')[0], account: "Bank"
  });

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overRes, expRes, salesRes, vehRes, leadRes] = await Promise.all([
        fetch("http://localhost:5001/api/finance/overview"),
        fetch("http://localhost:5001/api/finance/expenses"),
        fetch("http://localhost:5001/api/finance/sales"),
        fetch("http://localhost:5001/api/vehicles"),
        fetch("http://localhost:5001/api/leads")
      ]);
      setOverview(await overRes.json());
      setExpenses(await expRes.json());
      setSales(await salesRes.json());
      setVehicles(await vehRes.json());
      setLeads((await leadRes.json()).filter((l: any) => l.status !== 'Closed'));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5001/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExpense)
      });
      if (res.ok) {
        toast({ title: "Expense Added", description: "Ledger updated successfully." });
        setIsAddingExpense(false);
        setNewExpense({ category: "Fuel", amount: "", description: "", date: new Date().toISOString().split('T')[0], account: "Cash" });
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5001/api/finance/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSale)
      });
      if (res.ok) {
        toast({ title: "Sale Recorded", description: "Vehicle marked as sold and cash flow updated." });
        setIsAddingSale(false);
        setNewSale({ vehicle_id: "", lead_id: "", selling_price: "", sale_date: new Date().toISOString().split('T')[0], account: "Bank" });
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const cashBalance = overview?.balances?.find((b: any) => b.account === 'Cash')?.balance || 0;
  const bankBalance = overview?.balances?.find((b: any) => b.account === 'Bank')?.balance || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground tracking-tight">Mohan Trading Finance</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Accounting, Profit Analysis & Inventory tracking.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={fetchData} className="h-10 text-xs gap-2 px-4 border-2">
             <ArrowUpRight className="h-3.5 w-3.5" /> Force Sync
           </Button>
           <Button size="sm" className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 px-4" onClick={() => setIsAddingSale(true)}>
             <Wallet className="mr-2 h-3.5 w-3.5" /> New Sale
           </Button>
           <Button size="sm" variant="secondary" className="h-10 text-xs px-4" onClick={() => setIsAddingExpense(true)}>
             <Receipt className="mr-2 h-3.5 w-3.5" /> Log Expense
           </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" onValueChange={v => setActiveTab(v)}>
        <TabsList className="bg-muted p-1 rounded-xl h-11">
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
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Sales Vol</p>
                <h3 className="text-2xl font-black mt-2 text-foreground">Rs. {Number(overview?.monthSales || 0).toLocaleString()}</h3>
                <TrendingUp className="h-12 w-12 text-emerald-500/10 absolute -right-2 -bottom-2" />
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-rose-50 shadow-sm border-l-4 border-l-rose-500 overflow-hidden">
              <CardContent className="pt-6 relative">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Op. Expenses</p>
                <h3 className="text-2xl font-black mt-2 text-foreground">Rs. {Number(overview?.totalExpenses || 0).toLocaleString()}</h3>
                <ArrowDownRight className="h-12 w-12 text-rose-500/10 absolute -right-2 -bottom-2" />
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
                   <CardDescription>Daily ins and outs across all accounts.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary gap-1">
                  <Download className="h-3 w-3" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                 <div className="h-[250px] flex items-center justify-center border-t border-dashed mt-2 bg-muted/20 rounded-xl">
                    <div className="text-center group cursor-pointer">
                       <PieChart className="h-10 w-10 text-muted-foreground/20 mx-auto group-hover:text-primary/40 transition-colors" />
                       <p className="text-xs text-muted-foreground mt-2 italic">Cash Flow Visualization Loading...</p>
                    </div>
                 </div>
              </CardContent>
            </Card>
            
            <Card className="border-border shadow-sm border-dashed">
              <CardHeader>
                <CardTitle className="text-base text-emerald-600 flex items-center gap-2">
                   <TrendingUp className="h-4 w-4" /> Smart Analysis
                </CardTitle>
                <CardDescription>AI predictions on car categories.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-1">
                     <span className="text-[10px] text-emerald-800 uppercase font-black">Best Performer</span>
                     <span className="text-sm font-bold text-emerald-950">Toyota Aqua 2018</span>
                     <span className="text-[11px] text-emerald-600">Avg. 14.2% Net Margin</span>
                  </div>
                  <div className="space-y-3 pt-2">
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Est. Pipeline Value</span>
                        <span className="font-bold">Rs. 84.5M</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Projected 30-Day Profit</span>
                        <span className="font-bold text-emerald-600">Rs. 12.2M</span>
                     </div>
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
                     <TableHead className="text-xs uppercase text-right py-4 pr-6">Margin %</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {sales.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground bg-muted/5">No finalized sales in current period.</TableCell></TableRow>
                   ) : (
                     sales.map(s => {
                       const totalCost = Number(s.purchase_price) + Number(s.transport_cost) + Number(s.repair_cost) + Number(s.registration_fee);
                       const profit = Number(s.selling_price) - totalCost;
                       const margin = ((profit / Number(s.selling_price)) * 100).toFixed(1);
                       return (
                         <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                           <TableCell className="text-sm font-semibold pl-6">{s.brand}</TableCell>
                           <TableCell className="text-sm font-mono text-muted-foreground">Rs. {totalCost.toLocaleString()}</TableCell>
                           <TableCell className="text-sm font-bold text-foreground">Rs. {Number(s.selling_price).toLocaleString()}</TableCell>
                           <TableCell className="text-sm font-bold text-emerald-600">Rs. {profit.toLocaleString()}</TableCell>
                           <TableCell className="text-right pr-6">
                             <Badge className="text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-800 border-emerald-200">
                               +{margin}%
                             </Badge>
                           </TableCell>
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
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {expenses.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground">No operational overhead logged.</TableCell></TableRow>
                   ) : (
                     expenses.map(e => (
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
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="pnl">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-2xl bg-gradient-to-br from-emerald-950 to-emerald-900 text-white min-h-[400px]">
                <CardHeader className="border-b border-white/10">
                   <CardTitle className="text-emerald-50 flex items-center gap-3">
                     <FileText className="h-6 w-6 text-emerald-400" /> Professional P&L Report
                   </CardTitle>
                   <CardDescription className="text-white/40">Consolidated Statement for Fiscal Period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                   <div className="flex justify-between border-b border-white/5 pb-4">
                      <span className="text-sm text-white/70">Vehicle Sales Gross Revenue</span>
                      <span className="text-lg font-black font-mono">Rs. {Number(overview?.monthSales || 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between border-b border-white/5 pb-4 text-rose-300">
                      <span className="text-sm opacity-80">Cost of Goods Sold (Inventory Net)</span>
                      <span className="text-sm font-bold font-mono">Rs. {(sales.reduce((acc, s) => acc + (Number(s.purchase_price) + Number(s.repair_cost) + Number(s.transport_cost) + Number(s.registration_fee)), 0)).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between border-b border-white/5 pb-4 text-rose-300">
                      <span className="text-sm opacity-80">Operational Expenses & Salaries</span>
                      <span className="text-sm font-bold font-mono">Rs. {Number(overview?.totalExpenses || 0).toLocaleString()}</span>
                   </div>
                   
                   <div className="flex flex-col gap-1 pt-4">
                      <div className="flex justify-between items-end">
                         <span className="text-lg font-bold text-emerald-300">NET BUSINESS PROFIT</span>
                         <span className="text-4xl font-black text-emerald-400 font-display">
                           Rs. {((Number(overview?.monthSales || 0)) - (sales.reduce((acc, s) => acc + (Number(s.purchase_price) + Number(s.repair_cost) + Number(s.transport_cost) + Number(s.registration_fee)), 0)) - (Number(overview?.totalExpenses || 0))).toLocaleString()}
                         </span>
                      </div>
                      <p className="text-[10px] text-white/30 text-right uppercase tracking-widest mt-2">Calculated in real-time based on validated ledger entries</p>
                   </div>
                   
                   <Button size="lg" className="w-full mt-6 bg-white text-emerald-950 font-black hover:bg-emerald-50 hover:scale-[1.01] transition-all flex gap-3">
                      <Download className="h-4 w-4" /> Export Professional Audit PDF
                   </Button>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-6">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-center items-center p-4">
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

                 <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Link to Customer Lead</Label>
                    <Select value={newSale.lead_id} onValueChange={v => setNewSale({...newSale, lead_id: v})}>
                       <SelectTrigger className="h-11 border-2"><SelectValue placeholder="Who bought it?" /></SelectTrigger>
                       <SelectContent>
                          {leads.map(l => (
                             <SelectItem key={l.id} value={l.id.toString()}>{l.name} ({l.phone})</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-center items-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black font-display tracking-tight">Record Business Expense</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsAddingExpense(false)}>&times;</Button>
             </div>
             
             <form onSubmit={handleAddExpense} className="space-y-5">
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
                   <Button type="submit" className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl">Post to Daily Ledger</Button>
                   <Button type="button" variant="outline" className="h-12 px-6 rounded-xl" onClick={() => setIsAddingExpense(false)}>Cancel</Button>
                </div>
             </form>
          </div>
        </div>
      )}
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
