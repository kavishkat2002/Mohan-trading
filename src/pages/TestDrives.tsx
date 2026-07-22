import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Calendar, User, Car, CheckCircle2,
  Clock, XCircle, Trash2, AlertCircle, RefreshCcw
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
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads`),
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/vehicles`),
        fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/test-drives`)
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
    const interval = setInterval(() => fetchData(true), 5000);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/test-drives`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/test-drives/${bookingId}`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/test-drives/${bookingId}`, {
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Completed':
        return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'Cancelled':
        return { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' };
      default:
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' };
    }
  };

  const stats = [
    { label: 'Total', value: bookings.length, color: 'text-foreground', dot: 'bg-foreground/30' },
    { label: 'Scheduled', value: bookings.filter(b => b.status === 'Scheduled').length, color: 'text-amber-600', dot: 'bg-amber-400' },
    { label: 'Completed', value: bookings.filter(b => b.status === 'Completed').length, color: 'text-emerald-600', dot: 'bg-emerald-400' },
    { label: 'Cancelled', value: bookings.filter(b => b.status === 'Cancelled').length, color: 'text-rose-600', dot: 'bg-rose-400' },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-6 space-y-6">

      {/* ── Hero Banner with Illustration ── */}
      <div className="rounded-xl border bg-gradient-to-br from-sky-50/60 to-slate-50 dark:from-sky-950/20 dark:to-slate-900/40 overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 gap-4">
          {/* Text */}
          <div className="sm:max-w-xs">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Test Drives</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Schedule and manage customer test drives with ease.
            </p>
          </div>

          {/* Illustration */}
          <div className="w-56 sm:w-64 shrink-0 opacity-90">
            <svg viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
              {/* Sky / clouds */}
              <rect width="320" height="160" fill="transparent" />
              {/* City skyline silhouette */}
              <rect x="20" y="95" width="12" height="30" rx="1" fill="#C8DFF0" opacity="0.55" />
              <rect x="16" y="85" width="20" height="40" rx="1" fill="#C8DFF0" opacity="0.45" />
              <rect x="40" y="100" width="10" height="25" rx="1" fill="#C8DFF0" opacity="0.45" />
              <rect x="54" y="90" width="14" height="35" rx="1" fill="#C8DFF0" opacity="0.4" />
              <rect x="245" y="92" width="12" height="33" rx="1" fill="#C8DFF0" opacity="0.45" />
              <rect x="260" y="82" width="18" height="43" rx="1" fill="#C8DFF0" opacity="0.55" />
              <rect x="281" y="97" width="10" height="28" rx="1" fill="#C8DFF0" opacity="0.4" />
              <rect x="294" y="87" width="16" height="38" rx="1" fill="#C8DFF0" opacity="0.45" />
              {/* Cloud 1 */}
              <ellipse cx="82" cy="32" rx="22" ry="10" fill="#D6E9F5" opacity="0.7" />
              <ellipse cx="70" cy="36" rx="14" ry="9" fill="#D6E9F5" opacity="0.7" />
              <ellipse cx="96" cy="36" rx="13" ry="8" fill="#D6E9F5" opacity="0.7" />
              {/* Cloud 2 */}
              <ellipse cx="218" cy="26" rx="20" ry="9" fill="#D6E9F5" opacity="0.65" />
              <ellipse cx="207" cy="30" rx="13" ry="8" fill="#D6E9F5" opacity="0.65" />
              <ellipse cx="231" cy="30" rx="12" ry="7" fill="#D6E9F5" opacity="0.65" />
              {/* Ground line */}
              <line x1="20" y1="128" x2="300" y2="128" stroke="#B0C8D8" strokeWidth="1.5" strokeLinecap="round" />

              {/* ── Car body ── */}
              {/* Wheel rear */}
              <circle cx="100" cy="128" r="18" fill="#E8D9B8" stroke="#2C3E6B" strokeWidth="2.2" />
              <circle cx="100" cy="128" r="10" fill="#C8B898" stroke="#2C3E6B" strokeWidth="1.5" />
              <circle cx="100" cy="128" r="3" fill="#2C3E6B" />
              {/* Wheel front */}
              <circle cx="230" cy="128" r="18" fill="#E8D9B8" stroke="#2C3E6B" strokeWidth="2.2" />
              <circle cx="230" cy="128" r="10" fill="#C8B898" stroke="#2C3E6B" strokeWidth="1.5" />
              <circle cx="230" cy="128" r="3" fill="#2C3E6B" />
              {/* Chassis / floor */}
              <rect x="82" y="118" width="166" height="10" rx="3" fill="#E0ECF5" stroke="#2C3E6B" strokeWidth="2" />
              {/* Car top / roof */}
              <path d="M138 118 C138 118 148 78 180 75 C200 73 220 78 248 118Z" fill="#E0ECF5" stroke="#2C3E6B" strokeWidth="2.2" strokeLinejoin="round" />
              {/* Windscreen */}
              <path d="M188 118 C190 100 205 81 242 85 L248 118Z" fill="#B8D8EC" stroke="#2C3E6B" strokeWidth="1.6" strokeLinejoin="round" />
              {/* Rear window */}
              <path d="M140 118 C142 104 150 83 180 78 L182 118Z" fill="#B8D8EC" stroke="#2C3E6B" strokeWidth="1.6" strokeLinejoin="round" />

              {/* ── Passenger (left, seat) ── */}
              {/* Seat */}
              <rect x="136" y="100" width="22" height="18" rx="3" fill="#D6E9F5" stroke="#2C3E6B" strokeWidth="1.5" />
              <rect x="134" y="96" width="5" height="22" rx="2" fill="#D6E9F5" stroke="#2C3E6B" strokeWidth="1.5" />
              {/* Body */}
              <rect x="140" y="88" width="14" height="16" rx="6" fill="#4A9EBF" stroke="#2C3E6B" strokeWidth="1.5" />
              {/* Head */}
              <circle cx="147" cy="82" r="8" fill="#F5C5A3" stroke="#2C3E6B" strokeWidth="1.5" />
              {/* Seatbelt */}
              <path d="M148 90 L144 108" stroke="#F5D642" strokeWidth="2" strokeLinecap="round" />
              {/* Arm */}
              <path d="M154 95 L162 100" stroke="#2C3E6B" strokeWidth="1.5" strokeLinecap="round" />

              {/* ── Driver (right, steering) ── */}
              {/* Body */}
              <rect x="188" y="90" width="14" height="16" rx="6" fill="#4DBFB0" stroke="#2C3E6B" strokeWidth="1.5" />
              {/* Head */}
              <circle cx="195" cy="84" r="8" fill="#F5C5A3" stroke="#2C3E6B" strokeWidth="1.5" />
              {/* Steering wheel */}
              <circle cx="218" cy="102" r="9" fill="none" stroke="#2C3E6B" strokeWidth="2" />
              <line x1="218" y1="93" x2="218" y2="111" stroke="#2C3E6B" strokeWidth="1.5" />
              <line x1="209" y1="102" x2="227" y2="102" stroke="#2C3E6B" strokeWidth="1.5" />
              {/* Arms to wheel */}
              <path d="M202 97 L211 100" stroke="#2C3E6B" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M202 102 L209 105" stroke="#2C3E6B" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* CTA Button */}
          <div className="sm:self-start flex items-center gap-2">
            {isAdmin && (
              <Button 
                onClick={() => {
                  toast({ title: "Syncing...", description: "Pulling latest test drives from cloud." });
                  fetchData().then(() => toast({ title: "Sync Complete", description: "Test drives successfully updated!" }));
                }} 
                size="sm" variant="outline" className="h-8 px-3 text-xs font-medium gap-1.5 bg-white/60 hover:bg-white border-slate-200 shadow-sm"
                disabled={loading}
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Sync Cloud
              </Button>
            )}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 px-3 text-xs font-medium gap-1.5 shadow-sm">
                  <Plus className="h-3.5 w-3.5" />
                  New Booking
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">Book a Test Drive</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Select the customer and vehicle to schedule a test drive session.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBooking} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</Label>
                    <Select required value={newBooking.lead_id} onValueChange={val => setNewBooking({ ...newBooking, lead_id: val })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select customer…" /></SelectTrigger>
                      <SelectContent>
                        {leads.map(l => (<SelectItem key={`lead-${l.id}`} value={l.id.toString()}>{l.name} ({l.phone})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicle</Label>
                    <Select required value={newBooking.vehicle_id} onValueChange={val => setNewBooking({ ...newBooking, vehicle_id: val })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select vehicle…" /></SelectTrigger>
                      <SelectContent>
                        {vehicles.filter(v => v.stock > 0).map(v => (<SelectItem key={`veh-${v.id}`} value={v.id.toString()}>{v.brand} — Rs. {Number(v.price).toLocaleString()}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date & Time</Label>
                    <Input required type="datetime-local" value={newBooking.booking_date} onChange={e => setNewBooking({ ...newBooking, booking_date: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes <span className="normal-case font-normal">(optional)</span></Label>
                    <Textarea placeholder="Any special requirements…" value={newBooking.notes} onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })} className="min-h-[72px] text-sm resize-none" />
                  </div>
                  <DialogFooter className="pt-1">
                    <Button type="submit" className="w-full h-9 text-sm" disabled={saving}>
                      {saving ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Scheduling…</> : "Schedule Booking"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>



      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-lg border bg-card px-4 py-3 flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full shrink-0 ${stat.dot}`} />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
              <p className={`text-lg font-semibold leading-tight ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bookings List ── */}
      {bookings.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No bookings yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click "New Booking" to schedule a test drive</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => {
            const cfg = getStatusConfig(booking.status);
            const StatusIcon = cfg.icon;
            return (
              <div
                key={booking.id}
                className="rounded-lg border bg-card px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-muted/20 transition-colors"
              >
                {/* Customer */}
                <div className="flex items-center gap-2.5 min-w-0 sm:w-48 shrink-0">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{booking.lead_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{booking.lead_phone}</p>
                  </div>
                </div>

                {/* Divider (visible on desktop) */}
                <div className="hidden sm:block h-8 w-px bg-border shrink-0" />

                {/* Vehicle */}
                <div className="flex items-center gap-1.5 sm:w-40 shrink-0">
                  <Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{booking.vehicle_brand}</span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-muted-foreground sm:w-36 shrink-0">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs">
                    {new Date(booking.booking_date).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Notes */}
                <div className="flex-1 min-w-0 hidden md:block">
                  <p className="text-xs text-muted-foreground truncate">
                    {booking.notes || <span className="italic opacity-60">No notes</span>}
                  </p>
                </div>

                {/* Status select */}
                <div className="shrink-0">
                  <Select
                    value={booking.status}
                    onValueChange={(val) => handleUpdateStatus(booking.id, val)}
                  >
                    <SelectTrigger className={`h-7 px-2.5 text-xs font-medium border rounded-full w-auto gap-1.5 shadow-none focus:ring-0 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3 shrink-0" />
                      <SelectValue>{booking.status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* WhatsApp source badge */}
                {(booking.source === 'whatsapp_auto' || booking.source === 'whatsapp_confirmed') && (
                  <span className={`shrink-0 hidden sm:flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 border ${booking.source === 'whatsapp_confirmed'
                      ? 'bg-sky-50 text-sky-600 border-sky-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                    {booking.source === 'whatsapp_confirmed' ? 'WA Confirmed' : 'WA Detected'}
                  </span>
                )}

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-md self-start sm:self-auto"
                  onClick={() => handleDeleteBooking(booking.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
