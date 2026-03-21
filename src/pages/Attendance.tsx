import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, CheckCircle, Clock } from "lucide-react";

// Get properly localized YYYY-MM-DD
const getLocalDateString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export default function Attendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isElevated = user?.role === 'owner' || user?.role === 'admin';
  
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [viewDate, setViewDate] = useState(getLocalDateString);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);

  const [myAttendance, setMyAttendance] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  
  // Leave request state
  const [leaveType, setLeaveType] = useState('Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchStatus = async (dateStr: string) => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5001/api/attendance/status/${user.id}?date=${dateStr}`);
      const data = await res.json();
      setTodayAttendance(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [attRes, leavesRes] = await Promise.all([
        fetch('http://localhost:5001/api/attendance/all'),
        fetch('http://localhost:5001/api/attendance/leaves')
      ]);
      const attData = await attRes.json();
      const leavesData = await leavesRes.json();
      setAllAttendance(Array.isArray(attData) ? attData : []);
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMyData = async () => {
    if (!user) return;
    try {
      const [attRes, leavesRes] = await Promise.all([
        fetch(`http://localhost:5001/api/attendance/my-attendance/${user.id}`),
        fetch(`http://localhost:5001/api/attendance/my-leaves/${user.id}`)
      ]);
      const attData = await attRes.json();
      const leavesData = await leavesRes.json();
      setMyAttendance(Array.isArray(attData) ? attData : []);
      setMyLeaves(Array.isArray(leavesData) ? leavesData : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus(viewDate);
    fetchMyData();
    if (isElevated) fetchAdminData();
  }, [user, viewDate, isElevated]);

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      return toast({ title: "Geolocation not supported", variant: "destructive" });
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`http://localhost:5001/api/attendance/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user?.id, lat: pos.coords.latitude, lng: pos.coords.longitude })
          });
          if (res.ok) {
            toast({ title: "Checked in successfully" });
            const today = getLocalDateString();
            setViewDate(today);
            fetchStatus(today);
            fetchMyData();
            if (isElevated) fetchAdminData();
          } else {
            const err = await res.json();
            toast({ title: err.error, variant: "destructive" });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        toast({ title: "Please allow location access to check in", variant: "destructive" });
        setLoadingLocation(false);
      }
    );
  };

  const handleCheckOut = () => {
    if (!navigator.geolocation) {
      return toast({ title: "Geolocation not supported", variant: "destructive" });
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`http://localhost:5001/api/attendance/check-out`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user?.id, lat: pos.coords.latitude, lng: pos.coords.longitude })
          });
          if (res.ok) {
            toast({ title: "Checked out successfully" });
            const today = getLocalDateString();
            setViewDate(today);
            fetchStatus(today);
            fetchMyData();
            if (isElevated) fetchAdminData();
          } else {
            const err = await res.json();
            toast({ title: err.error, variant: "destructive" });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        toast({ title: "Please allow location access to check out", variant: "destructive" });
        setLoadingLocation(false);
      }
    );
  };

  const submitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5001/api/attendance/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, leave_type: leaveType, start_date: startDate, end_date: endDate, reason })
      });
      if (res.ok) {
        toast({ title: "Leave request submitted" });
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchMyData();
        if (isElevated) fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateLeaveStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/attendance/leaves/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast({ title: "Leave status updated" });
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Attendance & Leave</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your daily punctuality and request leaves</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Daily Check-in / Out</CardTitle>
            <Input 
              type="date" 
              className="w-auto h-8 text-xs" 
              value={viewDate} 
              max={getLocalDateString()}
              onChange={e => setViewDate(e.target.value)} 
            />
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-4 bg-muted/30 rounded-lg flex flex-col items-center justify-center space-y-3 min-h-[150px]">
              {todayAttendance?.check_in_time && !todayAttendance?.check_out_time ? (
                <>
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-medium">Checked In at {new Date(todayAttendance.check_in_time).toLocaleTimeString()}</p>
                  <Button onClick={handleCheckOut} disabled={loadingLocation} variant="destructive">
                    {loadingLocation ? "Locating..." : "Checkout & Leave Office"}
                  </Button>
                </>
              ) : todayAttendance?.check_out_time ? (
                <>
                  <Clock className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Shift Completed</p>
                  <p className="text-xs text-muted-foreground">Checked out at {new Date(todayAttendance.check_out_time).toLocaleTimeString()}</p>
                </>
              ) : (viewDate !== getLocalDateString()) ? (
                <>
                  <Clock className="w-10 h-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">No Attendance Log</p>
                  <p className="text-xs text-muted-foreground">You did not check in on this date.</p>
                </>
              ) : (
                <>
                  <MapPin className="w-10 h-10 text-primary" />
                  <p className="text-sm font-medium">Ready to start your shift?</p>
                  <Button onClick={handleCheckIn} disabled={loadingLocation} className="bg-primary text-white">
                    {loadingLocation ? "Locating..." : "Check In to Office"}
                  </Button>
                </>
              )}
            </div>
            <p className="text-[11px] text-center text-muted-foreground">System requires precise location access to track arrival and departure from office.</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Request Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitLeaveRequest} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="text-sm bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leave">Full Day Leave</SelectItem>
                    <SelectItem value="Short Leave">Short Leave (Half Day)</SelectItem>
                    <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} required className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} required className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reason for Leave</Label>
                <Input value={reason} onChange={e=>setReason(e.target.value)} required placeholder="Sick, Vacation, etc..." className="text-sm" />
              </div>
              <Button type="submit" className="w-full h-9">Submit Request</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 mt-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground/90">My Records</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader><CardTitle className="text-lg">My Recent Attendance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAttendance.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium whitespace-nowrap">{new Date(a.date).toLocaleDateString()}</TableCell>
                      <TableCell>{a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell>{a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {myAttendance.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-4">No records found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle className="text-lg">My Leave Requests</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myLeaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.leave_type}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.start_date).toLocaleDateString()} <br className="hidden md:block" /> {new Date(l.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.status==='Pending'?'bg-amber-100 text-amber-800':l.status==='Approved'?'bg-emerald-100 text-emerald-800':'bg-red-100 text-red-800'}`}>
                          {l.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {myLeaves.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-4">No requests found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {isElevated && (
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Admin Dashboard: Team Attendance</h2>
          
          <Card className="border-border">
            <CardHeader><CardTitle className="text-lg">Today's Team Attendance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Check In Time</TableHead>
                    <TableHead>Check Out Time</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAttendance.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name || a.email}</TableCell>
                      <TableCell>{a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell>{a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell>
                        {a.check_in_lat ? <a href={`https://www.google.com/maps?q=${a.check_in_lat},${a.check_in_lng}`} target="_blank" className="text-blue-500 underline text-xs">View Map</a> : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allAttendance.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4">No records found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader><CardTitle className="text-lg">Leave Requests</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name || l.email}</TableCell>
                      <TableCell>{l.leave_type}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={l.reason}>{l.reason}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.status==='Pending'?'bg-amber-100 text-amber-800':l.status==='Approved'?'bg-emerald-100 text-emerald-800':'bg-red-100 text-red-800'}`}>
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {l.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200" onClick={() => updateLeaveStatus(l.id, 'Approved')}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-red-50 text-red-600 hover:bg-red-100 border-red-200" onClick={() => updateLeaveStatus(l.id, 'Rejected')}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {leaves.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4">No requests found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
