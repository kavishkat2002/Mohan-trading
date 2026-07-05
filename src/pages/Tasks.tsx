import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Calendar, User, Car, CheckCircle2,
  Clock, AlertCircle, Trash2, Filter, Eye
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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const { toast } = useToast();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const currentLocalUserId = users.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase())?.id;

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    vehicle_id: "",
    priority: "Medium",
    due_date: ""
  });

  const fetchData = async (silent = false) => {
    if (!user?.email) return;
    
    try {
      if (!silent) setLoading(true);
      
      // 1. Ensure user exists in local DB using existing /register route if /sync is unavailable
      try {
        const syncRes = await fetch("http://localhost:5001/api/users/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, role: user.role })
        });
        
        if (!syncRes.ok) {
          // Fallback to /register if sync is not found
          await fetch("http://localhost:5001/api/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              email: user.email, 
              password: "dummy_password_for_sync", 
              role: user.role 
            })
          });
        }
      } catch (e) {
        console.warn("User auto-registration attempt finished.");
      }

      // 2. Fetch Users & Vehicles
      const uRes = await fetch("http://localhost:5001/api/users");
      const usersData = uRes.ok ? await uRes.json() : [];
      
      let vehiclesData = [];
      try {
        const vRes = await fetch("http://localhost:5001/api/vehicles");
        if (vRes.ok) vehiclesData = await vRes.json();
      } catch (e) { console.error("Vehicles fetch failed", e); }

      setUsers(Array.isArray(usersData) ? usersData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);

      // 3. Fetch Tasks
      const localUser = (Array.isArray(usersData) ? usersData : []).find(
        (u: any) => u.email?.toLowerCase() === user?.email?.toLowerCase()
      );
      // Use the local ID if found, otherwise use a dummy ID that won't crash the query
      const localId = localUser ? localUser.id : -1;

      try {
        const tRes = await fetch(`http://localhost:5001/api/tasks?userId=${localId}&role=${user?.role}`);
        if (tRes.ok) {
          const tData = await tRes.json();
          setTasks(Array.isArray(tData) ? tData : []);
        }
      } catch (e) { console.error("Tasks fetch failed", e); }

      if (!silent) setLoading(false);
    } catch (err) {
      console.error("General Fetch Error:", err);
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(() => fetchData(true), 15000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigned_to) {
      toast({ title: "Missing Fields", description: "Please enter a title and select an employee.", variant: "destructive" });
      return;
    }

    try {
      setCreating(true);
      // Find the local user ID for the current logged-in user (by email)
      let currentUserLocal = users.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
      
      if (!currentUserLocal) {
        await fetchData();
        currentUserLocal = users.find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
      }

      const taskData = {
        ...newTask,
        vehicle_id: (newTask.vehicle_id === "" || newTask.vehicle_id === "none") ? null : parseInt(newTask.vehicle_id),
        assigned_to: parseInt(newTask.assigned_to),
        created_by: currentUserLocal ? currentUserLocal.id : null
      };

      if (!taskData.created_by) {
        toast({ 
          title: "Setup Needed", 
          description: "Your local profile is still being synchronized. Please wait a few seconds and try again.",
        });
        setCreating(false);
        return;
      }

      const res = await fetch("http://localhost:5001/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      });

      if (res.ok) {
        toast({ title: "Task Created", description: "Successfully assigned the task." });
        setIsOpen(false);
        setNewTask({ title: "", description: "", assigned_to: "", vehicle_id: "", priority: "Medium", due_date: "" });
        fetchData();
      } else {
        const errData = await res.json();
        toast({ title: "Error", description: errData.error || "Could not save task.", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Connection Error", description: "Could not reach the server. Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast({ title: "Status Updated", description: `Task marked as ${status}.` });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast({ title: "Task Deleted", description: "Task has been removed." });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed': return <Badge className="bg-green-500 hover:bg-green-600 text-white border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>;
      case 'In Progress': return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0"><Clock className="w-3 h-3 mr-1" /> Doing</Badge>;
      default: return <Badge variant="secondary" className="border-0"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High': return <Badge variant="destructive" className="border-0 font-bold tracking-tight">High</Badge>;
      case 'Low': return <Badge variant="outline" className="text-muted-foreground">Low</Badge>;
      default: return <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-0">Medium</Badge>;
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
          <h1 className="text-3xl font-bold tracking-tight">Tasks & Assignments</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage operations and employee task tracking.</p>
        </div>

        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Assign New Task</DialogTitle>
                <DialogDescription>Create a task and assign it to an employee.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input 
                    required 
                    placeholder="e.g. Check engine on BMW X5" 
                    value={newTask.title} 
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select 
                      required 
                      value={newTask.assigned_to}
                      onValueChange={val => setNewTask({...newTask, assigned_to: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.length > 0 ? users.filter(u => u.role !== 'owner' && u.role !== 'admin').map(u => (
                          <SelectItem key={`user-${u.id}`} value={u.id.toString()}>
                            {u.name || u.email}
                          </SelectItem>
                        )) : (
                          <div className="p-2">
                            <p className="text-xs text-muted-foreground mb-2 text-center">No employees found</p>
                            <Button variant="outline" size="sm" className="w-full h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); fetchData(); }}>
                              Retry Loading
                            </Button>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Link Vehicle (Optional)</Label>
                    <Select 
                      value={newTask.vehicle_id}
                      onValueChange={val => setNewTask({...newTask, vehicle_id: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Car" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (General Task)</SelectItem>
                        {vehicles.length > 0 ? vehicles.map(v => (
                          <SelectItem key={`veh-${v.id}`} value={v.id.toString()}>
                            {v.brand}
                          </SelectItem>
                        )) : (
                          <div className="p-2">
                            <p className="text-xs text-muted-foreground mb-2 text-center">No vehicles found</p>
                            <Button variant="outline" size="sm" className="w-full h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); fetchData(); }}>
                              Retry Loading
                            </Button>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select defaultValue="Medium" onValueChange={val => setNewTask({...newTask, priority: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input 
                      type="date" 
                      value={newTask.due_date} 
                      onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2 pb-12">
                  <Label>Description</Label>
                  <ReactQuill 
                    theme="snow"
                    placeholder="Describe the task details... Use bullets, links, etc." 
                    value={newTask.description} 
                    onChange={val => setNewTask({...newTask, description: val})}
                    className="bg-background h-[120px] rounded-md"
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{'list': 'ordered'}, {'list': 'bullet'}],
                        ['link', 'image'],
                        ['clean']
                      ],
                    }}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Create Task"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-50 border-slate-200 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/30 border-orange-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'Pending').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/30 border-blue-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'In Progress').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50/30 border-green-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-green-600 uppercase tracking-wider">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'Completed').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px]">Task Details</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No tasks found.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm leading-none">{task.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {task.description ? task.description.replace(/<[^>]+>/g, '') : "No description"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium">{task.assigned_to_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.vehicle_name ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Car className="h-3 w-3" />
                        {task.vehicle_name}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None</span>
                    )}
                  </TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={task.status} 
                      onValueChange={(val) => handleUpdateStatus(task.id, val)}
                      disabled={task.assigned_to !== currentLocalUserId}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs border-0 bg-transparent hover:bg-muted p-0 shadow-none focus:ring-0 disabled:opacity-100 disabled:cursor-default">
                        <SelectValue>
                          {getStatusBadge(task.status)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 mr-1"
                      onClick={() => {
                        setSelectedTask(task);
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTask(task.id)}
                      >

                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Task Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-semibold text-lg">{selectedTask?.title}</h3>
              {selectedTask?.description ? (
                <div 
                  className="text-sm text-muted-foreground mt-3 prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4"
                  dangerouslySetInnerHTML={{ __html: selectedTask.description }} 
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-2 italic">No description provided.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{selectedTask?.assigned_to_name}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {selectedTask?.status && getStatusBadge(selectedTask.status)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                {selectedTask?.priority && getPriorityBadge(selectedTask.priority)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {selectedTask?.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              {selectedTask?.vehicle_name && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Linked Vehicle</p>
                  <div className="flex items-center gap-2 text-sm font-medium bg-muted/30 p-2 rounded-md">
                    <Car className="h-4 w-4 text-primary" />
                    {selectedTask.vehicle_name}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
