import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, MessageSquare, CreditCard, Users, Banknote, PhoneCall } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function TeamManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const fetchUsers = () => {
    fetch("http://localhost:5001/api/users")
      .then(res => res.json())
      .then(data => {
         if(Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setIsAdding(true);
    try {
      const res = await fetch("http://localhost:5001/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: "sales" }) // Default to staff
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Team member added successfully" });
        setNewEmail("");
        setNewPassword("");
        fetchUsers();
      } else {
        toast({ title: "Failed to add member", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const changeRole = async (id: number, role: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/users/${id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        toast({ title: "Role updated successfully" });
        fetchUsers();
      } else {
        toast({ title: "Failed to update role", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={addMember} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end p-4 border border-primary/20 bg-primary/5 rounded-lg">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold">Email Address</Label>
          <Input 
            type="email" 
            placeholder="staff@mohantrading.com" 
            className="h-9 text-sm bg-white" 
            value={newEmail} 
            onChange={e => setNewEmail(e.target.value)} 
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold">Temporary Password</Label>
          <Input 
            type="password" 
            placeholder="••••••••" 
            className="h-9 text-sm bg-white" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
          />
        </div>
        <Button type="submit" disabled={isAdding || !newEmail || !newPassword} className="h-9 px-6 bg-primary text-white shadow-sm shadow-primary/20">
          {isAdding ? "Adding..." : "Add Member"}
        </Button>
      </form>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Current Members</h4>
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between p-3.5 border border-border bg-background/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">{u.email}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
            </div>
            <Select value={u.role || 'sales'} onValueChange={(val) => changeRole(u.id, val)}>
              <SelectTrigger className="w-32 h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="sales">Sales Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-muted-foreground">Loading team members...</p>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { business, userRole } = useBusiness();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankSwiftCode, setBankSwiftCode] = useState("");
  const [paymentGatewayLink, setPaymentGatewayLink] = useState("");
  const [paymentGatewayName, setPaymentGatewayName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");

  const updateBusiness = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("businesses").update({
        name: name || business?.name,
        contact_email: contactEmail || business?.contact_email,
        bank_name: bankName || business?.bank_name || null,
        bank_account_number: bankAccountNumber || business?.bank_account_number || null,
        bank_account_holder: bankAccountHolder || business?.bank_account_holder || null,
        bank_branch: bankBranch || business?.bank_branch || null,
        bank_swift_code: bankSwiftCode || business?.bank_swift_code || null,
        payment_gateway_link: paymentGatewayLink || business?.payment_gateway_link || null,
        payment_gateway_name: paymentGatewayName || business?.payment_gateway_name || null,
        business_type: businessType || (business as any)?.business_type || null,
        description: description || (business as any)?.description || null,
        contact_phone: whatsappPhone || business?.contact_phone || null,
        whatsapp_phone_number_id: whatsappPhoneNumberId || business?.whatsapp_phone_number_id || null,
      }).eq("id", business!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business"] }); toast({ title: "Settings updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
    <div className="border border-border rounded-lg bg-white">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your business configuration</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="bg-background border border-border p-0.5 rounded-lg h-auto">
          <TabsTrigger value="business" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><Building2 className="h-3.5 w-3.5" />Business</TabsTrigger>
          <TabsTrigger value="bank" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><Banknote className="h-3.5 w-3.5" />Bank & Payment</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><MessageSquare className="h-3.5 w-3.5" />WhatsApp</TabsTrigger>
          <TabsTrigger value="voice" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><PhoneCall className="h-3.5 w-3.5" />Voice AI</TabsTrigger>
          <TabsTrigger value="plans" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><CreditCard className="h-3.5 w-3.5" />Plans</TabsTrigger>
          <TabsTrigger value="team" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><Users className="h-3.5 w-3.5" />Team</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6">
          <SectionCard title="Business Profile" desc="Update your business information">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Name</Label>
              <Input defaultValue={business?.name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Type</Label>
              <Select onValueChange={setBusinessType} defaultValue={(business as any)?.business_type || ""}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail Store</SelectItem>
                  <SelectItem value="restaurant">Restaurant / Cafe</SelectItem>
                  <SelectItem value="service">Service Provider</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Description <span className="normal-case text-muted-foreground/60">(Used by AI to answer customers)</span>
              </Label>
              <Textarea
                placeholder="e.g. We sell premium used cars with warranty..."
                defaultValue={(business as any)?.description || ""}
                onChange={e => setDescription(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Email</Label>
              <Input type="email" defaultValue={business?.contact_email || ""} onChange={e => setContactEmail(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Role:</Label>
              <Badge variant="outline" className="text-[11px] rounded-md px-2 py-0.5 font-medium bg-primary/5 text-primary border-primary/20">{userRole || "—"}</Badge>
            </div>
            {['owner', 'admin'].includes(user?.role) && (
              <Button onClick={() => updateBusiness.mutate()} disabled={updateBusiness.isPending} className="bg-primary text-white hover:bg-primary/90 text-sm h-9 mt-2 shadow-sm shadow-primary/20">
                Save Changes
              </Button>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="bank" className="mt-6 space-y-4">
          <SectionCard title="Bank Details" desc="Configure your bank account details to share with customers for payments">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bank Name</Label>
              <Input placeholder="e.g., Bank of America" defaultValue={business?.bank_name || ""} onChange={e => setBankName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account Holder Name</Label>
              <Input placeholder="e.g., John's Business LLC" defaultValue={business?.bank_account_holder || ""} onChange={e => setBankAccountHolder(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account Number</Label>
              <Input placeholder="e.g., 1234567890" defaultValue={business?.bank_account_number || ""} onChange={e => setBankAccountNumber(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bank Branch (Optional)</Label>
              <Input placeholder="e.g., Main Street Branch" defaultValue={business?.bank_branch || ""} onChange={e => setBankBranch(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">SWIFT/BIC Code (Optional)</Label>
              <Input placeholder="e.g., BOFAUS3N" defaultValue={business?.bank_swift_code || ""} onChange={e => setBankSwiftCode(e.target.value)} className="h-9 text-sm" />
            </div>
          </SectionCard>

          <SectionCard title="Payment Gateway" desc="Configure payment gateway links to send to customers">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment Gateway Name</Label>
              <Input placeholder="e.g., PayPal, Stripe, Square" defaultValue={business?.payment_gateway_name || ""} onChange={e => setPaymentGatewayName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment Gateway Link</Label>
              <Input type="url" placeholder="e.g., https://paypal.me/yourbusiness" defaultValue={business?.payment_gateway_link || ""} onChange={e => setPaymentGatewayLink(e.target.value)} className="h-9 text-sm" />
            </div>
            {['owner', 'admin'].includes(user?.role) && (
              <Button onClick={() => updateBusiness.mutate()} disabled={updateBusiness.isPending} className="bg-primary text-white hover:bg-primary/90 text-sm h-9 shadow-sm shadow-primary/20">
                Save Payment Settings
              </Button>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="voice" className="mt-6">
          <SectionCard title="Sinhala AI Voice Agent" desc="Configure your automated AI voice caller for Sri Lanka">
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-primary/10 bg-primary/[0.03]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PhoneCall className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Voice Agent Status</p>
                  <p className="text-[11px] text-muted-foreground">Active and linked to system</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-emerald-700 font-medium">Online</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Primary Language</Label>
                <Select defaultValue="sinhala">
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Language" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sinhala">Sinhala (Sri Lanka)</SelectItem>
                    <SelectItem value="english">English (Global)</SelectItem>
                    <SelectItem value="tamil">Tamil (Sri Lanka)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Voice Personality</Label>
                <Select defaultValue="professional">
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select Personality" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional / Polite</SelectItem>
                    <SelectItem value="friendly">Friendly / Casual</SelectItem>
                    <SelectItem value="direct">Direct / Sales-focused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Voice AI Endpoint URL</Label>
              <div className="flex gap-2">
                <Input readOnly value="https://[YOUR_PROJECT].supabase.co/functions/v1/voice-agent" className="h-9 text-sm font-mono text-xs" />
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => {
                  navigator.clipboard.writeText("https://[YOUR_PROJECT].supabase.co/functions/v1/voice-agent");
                  toast({ title: "Link copied" });
                }}>Copy</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Copy this URL to your Vapi or Retell AI webhook configuration.</p>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Linked Features</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Real-time Catalog", active: true },
                  { label: "Order Tracking", active: true },
                  { label: "Customer CRM Sync", active: true },
                  { label: "Voice-to-Cart (Beta)", active: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 p-2.5 border border-border rounded-lg text-sm bg-background/50">
                    <div className={`h-1.5 w-1.5 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span className="text-xs text-foreground/80">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full bg-primary text-white hover:bg-primary/90 text-sm h-9 shadow-sm shadow-primary/20">Update Voice Agent Settings</Button>
          </SectionCard>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <SectionCard title="WhatsApp Configuration" desc="Configure your WhatsApp Business API integration">
            <p className="text-xs text-muted-foreground">Configure your WhatsApp contact details. The AI Bot will use this context.</p>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp Number (Contact Phone)</Label>
              <Input placeholder="+1234567890" defaultValue={business?.contact_phone || ""} onChange={e => setWhatsappPhone(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                WhatsApp Phone Number ID <span className="normal-case text-muted-foreground/60">(From Meta Developer Portal)</span>
              </Label>
              <Input placeholder="e.g. 1029384756..." defaultValue={business?.whatsapp_phone_number_id || ""} onChange={e => setWhatsappPhoneNumberId(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={`https://rskkufaczzltlwtpyect.supabase.co/functions/v1/whatsapp-webhook`} className="h-9 text-sm font-mono text-xs" />
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => {
                  navigator.clipboard.writeText(`https://rskkufaczzltlwtpyect.supabase.co/functions/v1/whatsapp-webhook`);
                  toast({ title: "Webhook URL copied" });
                }}>Copy</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Copy this to your Meta App Configuration. Set Verify Token to: <code className="px-1 py-0.5 bg-primary/5 text-primary rounded text-[10px]">smartbiz_verify_token</code></p>
            </div>
            {['owner', 'admin'].includes(user?.role) && (
              <Button onClick={() => updateBusiness.mutate()} disabled={updateBusiness.isPending} className="bg-primary text-white hover:bg-primary/90 text-sm h-9 shadow-sm shadow-primary/20">
                Save WhatsApp Settings
              </Button>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "Starter", price: "$29", features: ["WhatsApp automation", "Basic analytics", "Up to 500 customers"] },
              { name: "Growth", price: "$79", features: ["AI recommendations", "Advanced analytics", "Unlimited customers", "Priority support"] },
              { name: "Pro", price: "$199", features: ["Demand prediction", "Voice AI readiness", "Dedicated support", "Custom integrations"] },
            ].map(plan => (
              <div key={plan.name} className={`border rounded-lg bg-white ${plan.name === "Growth" ? "border-primary shadow-sm shadow-primary/10 ring-1 ring-primary/20" : "border-border"}`}>
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-foreground">{plan.name}</h3>
                    {plan.name === "Growth" && <Badge className="bg-primary/10 text-primary text-[10px] border-0">Popular</Badge>}
                  </div>
                  <p className="text-2xl font-semibold text-foreground font-sans mt-1">{plan.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                </div>
                <div className="p-6">
                  <ul className="space-y-2.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/80">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.name === "Growth" ? "default" : "outline"} 
                    className={`w-full mt-5 text-sm h-9 ${plan.name === "Growth" ? "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20" : ""}`}
                  >
                    {plan.name === "Growth" ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <SectionCard title="Team Members" desc="Manage team access and roles. 'Owner' has full access. 'Staff' can only see Vehicles, Leads, and Chat.">
            <TeamManager />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
