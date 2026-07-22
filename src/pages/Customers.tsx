import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Search, Trash2, MoreHorizontal, MessageCircle, 
  Phone, Users, Pencil
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const sourceStyles: Record<string, {
  label: string;
  badgeClass: string;
}> = {
  whatsapp: { 
    label: "WhatsApp", 
    badgeClass: "bg-slate-50 text-slate-700 border-slate-100"
  },
  facebook: { 
    label: "Facebook", 
    badgeClass: "bg-slate-50 text-slate-700 border-slate-100"
  },
  manual: { 
    label: "Manual", 
    badgeClass: "bg-slate-50 text-slate-700 border-slate-100"
  },
};

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Dialog/Modal states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Drawer Detail Flyout state
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Inline Details Edit states
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editCar, setEditCar] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [markSoldInInventory, setMarkSoldInInventory] = useState(true);
  const [editIsSold, setEditIsSold] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const isElevated = user?.role === 'owner' || user?.role === 'admin';

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

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads`);
      const data = await res.json();
      // Filter for closed/won deals OR WhatsApp live chat synced leads
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

  const fetchVehicles = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/vehicles`);
      const data = await res.json();
      setVehicles(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDetails = async () => {
    if (!selectedCustomer) return;
    setSavingDetails(true);
    try {
      const newStatus = editIsSold ? "Closed Deal" : "Negotiating";
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads/${selectedCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          interested_product: editCar,
          budget: editPrice,
          status: newStatus,
          source: selectedCustomer.source || "manual",
        }),
      });

      if (res.ok) {
        if (editIsSold && selectedVehicleId && markSoldInInventory) {
          const matched = vehicles.find(v => String(v.id) === String(selectedVehicleId));
          if (matched) {
            await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/finance/sales`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vehicle_id: matched.id,
                lead_id: selectedCustomer.id,
                selling_price: parseFloat(editPrice.replace(/[^0-9.]/g, "")) || matched.price,
                sale_date: new Date().toISOString().split('T')[0],
                payment_method: "Bank",
                account: "Bank Account"
              })
            });
          }
        }

        toast({ title: "Updated", description: "Customer details successfully updated." });
        setIsEditingDetails(false);
        fetchCustomers();
        fetchVehicles();
        setSelectedCustomer({
          ...selectedCustomer,
          interested_product: editCar,
          budget: editPrice,
          status: newStatus
        });
      } else {
        toast({ title: "Error", description: "Failed to update customer details.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSavingDetails(false);
    }
  };

  useEffect(() => { 
    fetchCustomers(); 
    fetchVehicles();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: "Customer record removed." });
        setIsDeleteOpen(false);
        setDeleteId(null);
        fetchCustomers();
      } else {
        toast({ title: "Failed", description: "Could not delete customer record.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  };

  const getSourceInfo = (source: string) => {
    const key = (source || "manual").toLowerCase();
    return sourceStyles[key] || sourceStyles.manual;
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
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Customers Registry</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            View and manage all finalized customers, vehicles sold, and agent commissions.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-slate-50/20">
          <div className="relative w-full md:max-w-xs">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
             <Input 
               placeholder="Search name, phone, or car..." 
               className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary shadow-sm"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          <p className="text-xs font-semibold text-slate-500">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""} registered</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20 bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-slate-400 font-medium">Loading customers directory...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-6">Customer</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle Purchased</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 bg-white">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <img src="/customer-placeholder.png" alt="No Customers" className="w-56 h-auto max-w-[240px] object-contain opacity-90 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">No finalized customers found</p>
                          <p className="text-xs text-slate-400">Finalize sales and declare deals to build your customer base.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map(customer => {
                      const src = getSourceInfo(customer.source);
                      return (
                        <TableRow 
                          key={customer.id} 
                          className="hover:bg-slate-50/60 transition-colors border-slate-100 cursor-pointer group"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <TableCell className="pl-6 py-4 font-semibold text-slate-800 text-xs">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase shrink-0">
                                {customer.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                              </div>
                              <span className="hover:text-primary transition-colors font-semibold block text-slate-800">
                                {customer.name}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs text-slate-500 font-mono font-semibold">{customer.phone}</TableCell>

                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-600">
                              {src.label}
                            </span>
                          </TableCell>

                          <TableCell className="text-xs font-semibold text-slate-700">
                            {customer.interested_product || customer.interested_car || "—"}
                          </TableCell>





                          <TableCell className="text-right pr-6" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setIsDetailsOpen(true); }} className="text-xs gap-2 font-semibold">
                                  <Users className="h-3.5 w-3.5" /> View Profile
                                </DropdownMenuItem>
                                {isElevated && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setDeleteId(customer.id); setIsDeleteOpen(true); }} className="text-xs gap-2 text-red-600 focus:text-red-650 font-semibold">
                                      <Trash2 className="h-3.5 w-3.5" /> Remove Customer
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-slate-100 bg-white">
              {filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-white text-center gap-2">
                  <img src="/customer-placeholder.png" alt="No Customers" className="w-48 h-auto max-w-[200px] object-contain opacity-90 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No finalized customers found</p>
                  <p className="text-xs text-slate-400">Finalize sales and declare deals to build your customer base.</p>
                </div>
              ) : (
                filteredCustomers.map(customer => {
                  const src = getSourceInfo(customer.source);
                  return (
                    <div 
                      key={customer.id} 
                      className="p-4 flex gap-3 hover:bg-slate-50/40 cursor-pointer active:bg-slate-100 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 uppercase shrink-0">
                        {customer.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-slate-800 text-[14px] leading-tight truncate">{customer.name}</h4>
                            <p className="text-[12px] text-slate-500 font-mono font-medium mt-0.5">{customer.phone}</p>
                          </div>
                          
                          <div onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mt-1 -mr-1">
                                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setIsDetailsOpen(true); }} className="text-xs gap-2 font-semibold">
                                  <Users className="h-3.5 w-3.5" /> View Profile
                                </DropdownMenuItem>
                                {isElevated && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setDeleteId(customer.id); setIsDeleteOpen(true); }} className="text-xs gap-2 text-red-600 focus:text-red-650 font-semibold">
                                      <Trash2 className="h-3.5 w-3.5" /> Remove Customer
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[12.5px] font-medium text-slate-700 truncate">
                              🚗 {customer.interested_product || customer.interested_car || "—"}
                            </span>
                            {customer.budget && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                                {customer.budget}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                          <span>{src.label}</span>
                          <span>
                            {customer.assigned_to ? (
                              customer.assigned_to === user?.id ? (
                                <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Me</span>
                              ) : (
                                <span className="text-slate-500 font-medium">{customer.assigned_to_name || "Agent"}</span>
                              )
                            ) : (
                              <span className="italic text-slate-400">Unassigned</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* CUSTOMER DETAIL FLYOUT DRAWER */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto scrollbar-minimal rounded-l-3xl border-l border-slate-200">
          {selectedCustomer && (
            <div className="space-y-6 pt-6">
              <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-xl font-black shrink-0">
                  {selectedCustomer.name.split(" ").map((n: string) => n[0]).slice(0,2).join("").toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-[10px] font-bold rounded-full ${getStatusStyle(selectedCustomer.status)}`}>
                      {selectedCustomer.status}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{selectedCustomer.phone}</span>
                  </div>
                </div>
              </div>

              {/* Direct Communication Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 bg-emerald-50/20 text-xs font-bold rounded-xl transition-all"
                >
                  <MessageCircle className="h-4.5 w-4.5 text-emerald-500" />
                  Message WhatsApp
                </a>
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-slate-50/20 text-xs font-bold rounded-xl transition-all"
                >
                  <Phone className="h-4.5 w-4.5 text-slate-500" />
                  Call Customer
                </a>
              </div>

              {/* Complete Metadata Grid */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Customer File details</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold">Vehicle Purchased</p>
                    <p className="font-semibold text-slate-700 mt-1">{selectedCustomer.interested_product || selectedCustomer.interested_car || "—"}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 font-bold">Lead Source Channel</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="font-bold text-slate-700 capitalize">{getSourceInfo(selectedCustomer.source).label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">Captured Date</p>
                    <p className="font-semibold text-slate-700 mt-1">
                      {new Date(selectedCustomer.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">Remove Customer Profile?</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this customer record? This action is permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="text-xs h-9 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700 text-xs h-9 rounded-xl">Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
