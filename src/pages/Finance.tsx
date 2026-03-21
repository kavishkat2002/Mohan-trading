import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, ArrowUpRight, ArrowDownRight, Users, Loader2 } from "lucide-react";

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalCommissions: 0,
    activeDeals: 0
  });
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://localhost:5001/api/leads")
      .then(res => res.json())
      .then(data => {
        const closedDeals = data.filter((l: any) => l.status === 'Closed');
        
        let totalBudget = 0;
        let totalCommissions = 0;
        
        closedDeals.forEach((l: any) => {
          const budgetStr = l.budget || "0";
          const numericBudget = parseInt(budgetStr.replace(/[^0-9]/g, ''), 10) || 0;
          totalBudget += numericBudget;
          totalCommissions += parseFloat(l.commission_amount) || 0;
        });

        setStats({
          totalBudget,
          totalCommissions,
          activeDeals: data.filter((l: any) => l.status !== 'Closed').length
        });
        
        setLeads(data.filter((l: any) => l.commission_amount > 0));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Finance & Accounting</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Master overview of all tracked currency metrics, vehicle revenue volumes, and sales staff payroll distributions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Generated Revenue</CardTitle>
            <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Rs. {stats.totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total volume from officially closed leads.</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payout Pending</CardTitle>
            <div className="h-8 w-8 bg-rose-100 rounded-full flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Rs. {stats.totalCommissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Unprocessed total sales commission obligations.</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Negotiating Deals</CardTitle>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.activeDeals} Active</div>
            <p className="text-xs text-muted-foreground mt-1">Customers currently moving inside the pipeline.</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Commission Liability Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sales Rep</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Budget Range</TableHead>
                  <TableHead className="text-xs text-right">Commission Logged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">No commission history.</TableCell>
                  </TableRow>
                ) : (
                  leads.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm font-medium text-foreground">{l.assigned_to_name || "Unknown"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{l.budget}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-600 font-mono">
                        LKR {Number(l.commission_amount).toLocaleString()}
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
