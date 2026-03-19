import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const [newVehicle, setNewVehicle] = useState({
    brand: "", price: "", category: "", stock: "1", description: ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchVehicles = () => {
    fetch("http://localhost:5001/api/vehicles")
      .then(res => res.json())
      .then(data => { setVehicles(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const formData = new FormData();
    formData.append("brand", newVehicle.brand);
    formData.append("price", newVehicle.price);
    formData.append("category", newVehicle.category);
    formData.append("stock", newVehicle.stock);
    formData.append("description", newVehicle.description);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await fetch("http://localhost:5001/api/vehicles", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast({ title: "Success", description: "Vehicle added successfully!" });
        setIsOpen(false);
        setNewVehicle({ brand: "", price: "", category: "", stock: "1", description: "" });
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

  const filtered = vehicles.filter(v => 
    v.brand.toLowerCase().includes(search.toLowerCase()) || 
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vehicle Inventory</h1>
          <p className="text-slate-500">Manage your car fleet, pricing, and stock levels.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>Enter the car's details and upload a photo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddVehicle} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand & Model</Label>
                  <Input required value={newVehicle.brand} onChange={e => setNewVehicle({...newVehicle, brand: e.target.value})} placeholder="Toyota Prius" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Rs.)</Label>
                  <Input required type="number" step="0.01" value={newVehicle.price} onChange={e => setNewVehicle({...newVehicle, price: e.target.value})} placeholder="7500000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input value={newVehicle.category} onChange={e => setNewVehicle({...newVehicle, category: e.target.value})} placeholder="Sedan" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input type="number" value={newVehicle.stock} onChange={e => setNewVehicle({...newVehicle, stock: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input value={newVehicle.description} onChange={e => setNewVehicle({...newVehicle, description: e.target.value})} placeholder="Excellent condition..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Vehicle Image</Label>
                <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Vehicle
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
             <Input placeholder="Search cars..." className="pl-9 bg-white border-slate-200" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600 w-[100px]">Image</TableHead>
                  <TableHead className="font-semibold text-slate-600">Brand / Model</TableHead>
                  <TableHead className="font-semibold text-slate-600">Category</TableHead>
                  <TableHead className="font-semibold text-slate-600">Stock</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">No vehicles found.</TableCell></TableRow>
                ) : (
                  filtered.map(v => (
                    <TableRow key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell>
                        {v.image_url ? (
                          <img src={`http://localhost:5001${v.image_url}`} alt="car" className="w-16 h-12 object-cover rounded-md border border-slate-200" />
                        ) : (
                          <div className="w-16 h-12 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{v.brand}</TableCell>
                      <TableCell className="text-slate-600">{v.category || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{v.stock} in stock</Badge></TableCell>
                      <TableCell className="text-right font-mono font-medium">Rs. {Number(v.price).toLocaleString()}</TableCell>
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
