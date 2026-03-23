import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Search, Plus, Image as ImageIcon, Pencil, Trash2, MoreHorizontal, 
  CheckCircle, Wallet, ShoppingCart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Vehicles() {
  const { user } = useAuth();
  const canUpdate = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'sales';
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const { toast } = useToast();

  const [newVehicle, setNewVehicle] = useState({
    brand: "", price: "", category: "", stock: "1", description: "",
    purchase_price: "0", transport_cost: "0", repair_cost: "0", registration_fee: "0"
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Sale tracking state
  const [isSelling, setIsSelling] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [newSale, setNewSale] = useState({
    lead_id: "", selling_price: "", sale_date: new Date().toISOString().split('T')[0], account: "Bank"
  });

  const fetchVehicles = () => {
    fetch("http://localhost:5001/api/vehicles")
      .then(res => res.json())
      .then(data => { setVehicles(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  const fetchLeads = () => {
    fetch("http://localhost:5001/api/leads")
      .then(res => res.json())
      .then(data => setLeads((data || []).filter((l: any) => l.status !== 'Closed')))
      .catch(console.error);
  };

  useEffect(() => { 
    fetchVehicles(); 
    if (canUpdate) fetchLeads();
  }, [canUpdate]);

  const handleMarkSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !newSale.lead_id) return;
    try {
      const res = await fetch("http://localhost:5001/api/finance/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: selectedVehicle.id,
          lead_id: newSale.lead_id,
          selling_price: newSale.selling_price || selectedVehicle.price,
          sale_date: newSale.sale_date,
          payment_method: "Bank",
          account: newSale.account
        })
      });
      if (res.ok) {
        toast({ title: "Sale Verified", description: "Finance ledger updated & vehicle stock reduced." });
        setIsSelling(false);
        fetchVehicles();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const formData = new FormData();
    formData.append("brand", newVehicle.brand);
    formData.append("price", newVehicle.price);
    formData.append("category", newVehicle.category);
    formData.append("stock", newVehicle.stock);
    formData.append("description", newVehicle.description);
    formData.append("purchase_price", newVehicle.purchase_price);
    formData.append("transport_cost", newVehicle.transport_cost);
    formData.append("repair_cost", newVehicle.repair_cost);
    formData.append("registration_fee", newVehicle.registration_fee);
    if (imageFile) {
      formData.append("image", imageFile);
    } else if (editingVehicle && editingVehicle.image_url) {
      formData.append("existing_image", editingVehicle.image_url);
    }

    try {
      const url = editingVehicle 
        ? `http://localhost:5001/api/vehicles/${editingVehicle.id}`
        : "http://localhost:5001/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });
      if (res.ok) {
        toast({ title: "Success", description: editingVehicle ? "Vehicle updated successfully!" : "Vehicle added successfully!" });
        setIsOpen(false);
        setEditingVehicle(null);
        setNewVehicle({ 
          brand: "", price: "", category: "", stock: "1", description: "",
          purchase_price: "0", transport_cost: "0", repair_cost: "0", registration_fee: "0"
        });
        setImageFile(null);
        fetchVehicles();
      } else {
        const error = await res.json();
        toast({ title: "Failed", description: error.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setIsAdding(false);
  };

  const handleEditVehicle = (v: any) => {
    setEditingVehicle(v);
    setNewVehicle({
      brand: v.brand,
      price: v.price.toString(),
      category: v.category || "",
      stock: v.stock.toString(),
      description: v.description || "",
      purchase_price: (v.purchase_price || 0).toString(),
      transport_cost: (v.transport_cost || 0).toString(),
      repair_cost: (v.repair_cost || 0).toString(),
      registration_fee: (v.registration_fee || 0).toString()
    });
    setIsOpen(true);
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/vehicles/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast({ title: "Deleted", description: "Vehicle removed successfully." });
        fetchVehicles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = vehicles.filter(v => 
    v.brand.toLowerCase().includes(search.toLowerCase()) || 
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Vehicle Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your car fleet, pricing, and stock levels.</p>
        </div>
        
        {canUpdate && (
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingVehicle(null);
              setNewVehicle({ 
                brand: "", price: "", category: "", stock: "1", description: "",
                purchase_price: "0", transport_cost: "0", repair_cost: "0", registration_fee: "0"
              });
              setImageFile(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-primary/90 text-sm h-9 px-4 shadow-sm shadow-primary/20">
                <Plus className="mr-2 h-3.5 w-3.5" /> Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                </DialogTitle>
                <DialogDescription>
                  {editingVehicle ? "Update the vehicle details below." : "Enter the car's details and upload a photo."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddVehicle} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Brand & Model</Label>
                    <Input required value={newVehicle.brand} onChange={e => setNewVehicle({...newVehicle, brand: e.target.value})} placeholder="Toyota Prius" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Price (Rs.)</Label>
                    <Input required type="number" step="0.01" value={newVehicle.price} onChange={e => setNewVehicle({...newVehicle, price: e.target.value})} placeholder="7500000" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                    <Input value={newVehicle.category} onChange={e => setNewVehicle({...newVehicle, category: e.target.value})} placeholder="Sedan" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stock</Label>
                    <Input type="number" value={newVehicle.stock} onChange={e => setNewVehicle({...newVehicle, stock: e.target.value})} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
                  <Input value={newVehicle.description} onChange={e => setNewVehicle({...newVehicle, description: e.target.value})} placeholder="Excellent condition..." className="h-9 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-3 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold text-emerald-600">Purchase Price (Cost)</Label>
                    <Input type="number" value={newVehicle.purchase_price} onChange={e => setNewVehicle({...newVehicle, purchase_price: e.target.value})} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Repair Cost</Label>
                    <Input type="number" value={newVehicle.repair_cost} onChange={e => setNewVehicle({...newVehicle, repair_cost: e.target.value})} className="h-9 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Transport Cost</Label>
                    <Input type="number" value={newVehicle.transport_cost} onChange={e => setNewVehicle({...newVehicle, transport_cost: e.target.value})} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Reg. / Taxes</Label>
                    <Input type="number" value={newVehicle.registration_fee} onChange={e => setNewVehicle({...newVehicle, registration_fee: e.target.value})} className="h-9 text-sm" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vehicle Image</Label>
                  <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="text-sm" />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="text-sm h-9">Cancel</Button>
                  <Button type="submit" disabled={isAdding} className="bg-primary text-white hover:bg-primary/90 text-sm h-9">
                    {isAdding && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Save Vehicle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative w-full md:max-w-xs">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
             <Input placeholder="Search cars..." className="pl-9 h-9 text-sm bg-background border-border" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-background/50">
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]">Image</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand / Model</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</TableHead>
                {canUpdate && <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-16 text-sm text-muted-foreground">No vehicles found.</TableCell></TableRow>
              ) : (
                filtered.map(v => (
                  <TableRow key={v.id} className="hover:bg-primary/[0.02] transition-colors border-border">
                    <TableCell>
                      {v.image_url ? (
                        <img src={`http://localhost:5001${v.image_url}`} alt="car" className="w-14 h-10 object-cover rounded-md border border-border" />
                      ) : (
                        <div className="w-14 h-10 bg-primary/5 rounded-md border border-border flex items-center justify-center">
                          <img src="/car-icon.png" alt="car" className="h-5 w-5 opacity-20" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-sm">{v.brand}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-medium rounded-md px-2 py-0.5 border-border text-muted-foreground">
                        {v.stock} in stock
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium text-foreground">Rs. {Number(v.price).toLocaleString()}</TableCell>
                    {canUpdate && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="w-48">
                             {v.stock > 0 && (
                               <DropdownMenuItem onClick={() => { setSelectedVehicle(v); setNewSale(prev => ({...prev, selling_price: v.price.toString()})); setIsSelling(true); }} className="text-xs gap-2 text-emerald-600 font-bold focus:text-emerald-600">
                                 <ShoppingCart className="h-3 w-3" /> Mark as Sold
                               </DropdownMenuItem>
                             )}
                             <DropdownMenuItem onClick={() => handleEditVehicle(v)} className="text-xs gap-2">
                               <Pencil className="h-3 w-3" /> Edit Details
                             </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => handleDeleteVehicle(v.id)} className="text-xs gap-2 text-rose-600 focus:text-rose-600">
                               <Trash2 className="h-3 w-3" /> Delete Vehicle
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sale Confirmation Dialog */}
      <Dialog open={isSelling} onOpenChange={setIsSelling}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-display">Finalize Sale</DialogTitle>
            <DialogDescription>Mark {selectedVehicle?.brand} as sold and record revenue.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMarkSold} className="space-y-4 py-4">
             <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Select Buyer (Lead)</Label>
                <Select value={newSale.lead_id} onValueChange={v => setNewSale({...newSale, lead_id: v})}>
                   <SelectTrigger><SelectValue placeholder="Link this sale to a lead" /></SelectTrigger>
                   <SelectContent>
                      {leads.map(l => (
                         <SelectItem key={l.id} value={l.id.toString()}>{l.name} ({l.phone})</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </div>
             <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Final Selling Price (Rs.)</Label>
                <Input type="number" value={newSale.selling_price} onChange={e => setNewSale({...newSale, selling_price: e.target.value})} className="h-9" />
             </div>
             <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Deposit to Account</Label>
                <Select value={newSale.account} onValueChange={v => setNewSale({...newSale, account: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="Bank">Bank Account</SelectItem>
                      <SelectItem value="Cash">Cash Drawer</SelectItem>
                   </SelectContent>
                </Select>
             </div>
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsSelling(false)} className="h-9">Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">Confirm Sale</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
