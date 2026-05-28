import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Calendar, User, Car, CheckCircle2,
  Clock, XCircle, Trash2, Edit, AlertCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestDrives() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const { toast } = useToast();

  const [bookings, setBookings] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newBooking, setNewBooking] = useState({
    lead_id: "",
    vehicle_id: "",
    booking_date: "",
    notes: "",
    status: "Scheduled"
  });

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const [leadsRes, vehiclesRes, bookingsRes] = await Promise.all([
        fetch("http://localhost:5001/api/leads"),
        fetch("http://localhost:5001/api/vehicles"),
        fetch("http://localhost:5001/api/test-drives")
      ]);

      const leadsData = leadsRes.ok ? await leadsRes.json() : [];
      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : [];
      const bookingsData = bookingsRes.ok ? await bookingsRes.json() : [];

      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);

      if (!silent) setLoading(false);
    } catch (err) {
      console.error("Failed to fetch test drive data:", err);
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.lead_id || !newBooking.vehicle_id || !newBooking.booking_date) {
      toast({ title: "Missing Fields", description: "Please select a Customer (Lead), Vehicle, and Booking Date.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("http://localhost:5001/api/test-drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBooking)
      });

      if (res.ok) {
        toast({ title: "Booking Created", description: "Test drive has been successfully scheduled." });
        setIsOpen(false);
        setNewBooking({ lead_id: "", vehicle_id: "", booking_date: "", notes: "", status: "Scheduled" });
        fetchData();
      } else {
        const errData = await res.json();
        toast({ title: "Error", description: errData.error || "Could not schedule booking.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Connection Error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (bookingId: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/test-drives/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast({ title: "Status Updated", description: `Booking marked as ${status}.` });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to update booking status.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to update booking status.", variant: "destructive" });
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel and delete this test drive booking?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/test-drives/${bookingId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast({ title: "Booking Deleted", description: "Booking has been removed." });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete booking.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to delete booking.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'Cancelled':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-0"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0"><Clock className="w-3 h-3 mr-1" /> Scheduled</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Drive Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule and manage test drives for customers.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Book Test Drive
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Book a Test Drive</DialogTitle>
              <DialogDescription>Select the customer and vehicle to schedule a test drive session.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBooking} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Select Customer (Lead)</Label>
                <Select
                  required
                  value={newBooking.lead_id}
                  onValueChange={val => setNewBooking({...newBooking, lead_id: val})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Search / Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(l => (
                      <SelectItem key={`lead-${l.id}`} value={l.id.toString()}>
                        {l.name} ({l.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <Select
                  required
                  value={newBooking.vehicle_id}
                  onValueChange={val => setNewBooking({...newBooking, vehicle_id: val})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Vehicle from Inventory" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.stock > 0).map(v => (
                      <SelectItem key={`veh-${v.id}`} value={v.id.toString()}>
                        {v.brand} - Rs. {Number(v.price).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Booking Date & Time</Label>
                <Input
                  required
                  type="datetime-local"
                  value={newBooking.booking_date}
                  onChange={e => setNewBooking({...newBooking, booking_date: e.target.value})}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Optional Notes</Label>
                <Textarea
                  placeholder="E.g., Customer prefers morning drive, requires route map, etc."
                  value={newBooking.notes}
                  onChange={e => setNewBooking({...newBooking, notes: e.target.value})}
                  className="min-h-[80px] text-sm"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-10" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Schedule Booking"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-50/50 border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bookings.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/30 border-amber-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'Scheduled').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/30 border-emerald-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'Completed').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/30 border-rose-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'Cancelled').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No test drives booked yet.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm block">{booking.lead_name}</span>
                        <span className="text-xs text-muted-foreground">{booking.lead_phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Car className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{booking.vehicle_brand}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{new Date(booking.booking_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {booking.notes || <span className="italic">No notes</span>}
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={booking.status} 
                      onValueChange={(val) => handleUpdateStatus(booking.id, val)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs border-0 bg-transparent hover:bg-muted p-0 shadow-none focus:ring-0">
                        <SelectValue>
                          {getStatusBadge(booking.status)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDeleteBooking(booking.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
