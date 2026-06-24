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
import { Building2, MessageSquare, CreditCard, Users, Banknote, PhoneCall, Trash2, AlertTriangle, Brain, Sparkles, Send, RefreshCw, Plus, X, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function TeamManager({ isOwner }: { isOwner: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchUsers = () => {
    fetch("http://localhost:5001/api/admin/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
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
      const res = await fetch("http://localhost:5001/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: "sales" })
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "✅ Team member added!",
          description: `${newEmail} can now log in immediately with their temporary password.`
        });
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

  const changeRole = async (supabaseId: string, role: string) => {
    try {
      const res = await fetch(`http://localhost:5001/api/admin/update-role/${supabaseId}`, {
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

  const deleteMember = async (supabaseId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:5001/api/admin/delete-user/${supabaseId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Account deleted", description: "The team member's account has been permanently removed." });
        setConfirmDeleteId(null);
        fetchUsers();
      } else {
        toast({ title: "Failed to delete account", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setIsDeleting(false);
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
          <div key={u.id} className="border border-border bg-background/50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{u.email}</p>
                  {u.id === currentUser?.id && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">You</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
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
                {isOwner && u.id !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => setConfirmDeleteId(confirmDeleteId === u.id ? null : u.id)}
                    title="Delete account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Inline confirmation panel */}
            {confirmDeleteId === u.id && (
              <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-medium">
                    Permanently delete <span className="font-bold">{u.email}</span>? This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-rose-200 text-rose-600"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                    disabled={isDeleting}
                    onClick={() => deleteMember(u.id)}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
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
  const [slogan, setSlogan] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [metaAppId, setMetaAppId] = useState("");
  const [metaConfigId, setMetaConfigId] = useState("");

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState("google/gemini-2.5-flash");
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  const [aiBusinessDescription, setAiBusinessDescription] = useState("");
  const [aiFaqData, setAiFaqData] = useState<{ q: string; a: string }[]>([]);

  // Wizard sub-tab states
  const [aiBotName, setAiBotName] = useState("Alex");
  const [aiDealershipName, setAiDealershipName] = useState("Mohan Trading");
  const [aiGreetingMessage, setAiGreetingMessage] = useState("Hi! I'm Alex from AutoDrive Motors 👋 Looking for your dream car? Tell me what you have in mind!");
  const [aiTone, setAiTone] = useState("Professional & warm");
  const [aiLanguage, setAiLanguage] = useState("English");
  const [aiEmojiUsage, setAiEmojiUsage] = useState("Use emojis — feels friendly");
  const [aiAskNameRule, setAiAskNameRule] = useState("3rd message");
  const [aiAskBudgetRule, setAiAskBudgetRule] = useState("3rd message");
  const [aiUnansweredLimit, setAiUnansweredLimit] = useState("1 follow-up then stop");
  const [aiObjections, setAiObjections] = useState<{ objection: string; response: string }[]>([]);

  // FAQ input state
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Objection input state
  const [newObjection, setNewObjection] = useState("");
  const [newObjectionResponse, setNewObjectionResponse] = useState("");

  // n8n visual builder states
  const [activeNode, setActiveNode] = useState("agent");
  const [isSimOpen, setIsSimOpen] = useState(false);

  // Vehicles list for training
  const [aiVehicles, setAiVehicles] = useState<any[]>([]);
  const [searchCar, setSearchCar] = useState("");
  const [editingVehicleNotesId, setEditingVehicleNotesId] = useState<number | null>(null);
  const [vehicleNotesInput, setVehicleNotesInput] = useState("");
  const [isSavingVehicleNotes, setIsSavingVehicleNotes] = useState(false);

  // Simulator state
  const [simMessages, setSimMessages] = useState<{ sender: 'user' | 'bot'; content: string }[]>([
    { sender: 'bot', content: "Hi! I am your AI Sales Agent. Try chatting with me to test your current settings!" }
  ]);
  const [simInput, setSimInput] = useState("");
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchAiVehicles = () => {
    fetch("http://localhost:5001/api/vehicles")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAiVehicles(data);
      })
      .catch(console.error);
  };

  const saveVehicleNotes = async (id: number, notes: string) => {
    setIsSavingVehicleNotes(true);
    try {
      const res = await fetch(`http://localhost:5001/api/vehicles/${id}/ai-notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_notes: notes })
      });
      if (res.ok) {
        toast({ title: "Vehicle guidelines updated successfully" });
        setEditingVehicleNotesId(null);
        fetchAiVehicles();
      } else {
        const data = await res.json();
        toast({ title: "Failed to update guidelines", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setIsSavingVehicleNotes(false);
    }
  };

  useEffect(() => {
    fetchAiVehicles();
  }, []);

  useEffect(() => {
    if (business && !isLoaded) {
      if (business.name) setName(business.name);
      if (business.contact_email) setContactEmail(business.contact_email);
      if (business.bank_name) setBankName(business.bank_name);
      if (business.bank_account_number) setBankAccountNumber(business.bank_account_number);
      if (business.bank_account_holder) setBankAccountHolder(business.bank_account_holder);
      if (business.bank_branch) setBankBranch(business.bank_branch);
      if (business.bank_swift_code) setBankSwiftCode(business.bank_swift_code);
      if (business.payment_gateway_link) setPaymentGatewayLink(business.payment_gateway_link);
      if (business.payment_gateway_name) setPaymentGatewayName(business.payment_gateway_name);
      if (business.business_type) setBusinessType(business.business_type);
      if (business.description) setDescription(business.description);
      if (business.slogan) setSlogan(business.slogan);
      if (business.logo_url) setLogoUrl(business.logo_url);
      if (business.contact_phone) setWhatsappPhone(business.contact_phone);
      if (business.whatsapp_phone_number_id) setWhatsappPhoneNumberId(business.whatsapp_phone_number_id);
      if (business.whatsapp_token) setWhatsappToken(business.whatsapp_token);
      if (business.meta_app_id) setMetaAppId(business.meta_app_id);
      if (business.meta_config_id) setMetaConfigId(business.meta_config_id);
      
      // Load AI Settings
      if (business.ai_enabled !== undefined) setAiEnabled(business.ai_enabled);
      if (business.ai_model) setAiModel(business.ai_model);
      if (business.ai_system_prompt) setAiSystemPrompt(business.ai_system_prompt);
      if (business.ai_business_description) setAiBusinessDescription(business.ai_business_description);
      if (business.ai_faq_data) {
        try {
          const parsed = typeof business.ai_faq_data === 'string'
            ? JSON.parse(business.ai_faq_data)
            : business.ai_faq_data;
          if (Array.isArray(parsed)) {
            setAiFaqData(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      if (business.ai_bot_name) setAiBotName(business.ai_bot_name);
      if (business.ai_dealership_name) setAiDealershipName(business.ai_dealership_name);
      if (business.ai_greeting_message) setAiGreetingMessage(business.ai_greeting_message);
      if (business.ai_tone) setAiTone(business.ai_tone);
      if (business.ai_language) setAiLanguage(business.ai_language);
      if (business.ai_emoji_usage) setAiEmojiUsage(business.ai_emoji_usage);
      if (business.ai_ask_name_rule) setAiAskNameRule(business.ai_ask_name_rule);
      if (business.ai_ask_budget_rule) setAiAskBudgetRule(business.ai_ask_budget_rule);
      if (business.ai_unanswered_limit) setAiUnansweredLimit(business.ai_unanswered_limit);
      if (business.ai_objections) {
        try {
          const parsed = typeof business.ai_objections === 'string'
            ? JSON.parse(business.ai_objections)
            : business.ai_objections;
          if (Array.isArray(parsed)) {
            setAiObjections(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsLoaded(true);
    }
  }, [business, isLoaded]);

  const handleFbEmbeddedSignup = () => {
    if (!metaAppId.trim()) {
      toast({
        title: "Meta App ID required",
        description: "Please enter your Meta App ID under the Recommended Connection section.",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem("meta_app_id", metaAppId.trim());
    localStorage.setItem("meta_config_id", metaConfigId.trim());

    const redirectUri = encodeURIComponent(window.location.origin + "/dashboard/settings");
    const state = "whatsapp_signup_state";
    const configParam = metaConfigId.trim() ? `&config_id=${metaConfigId.trim()}` : "";
    
    // Official Meta WhatsApp Embedded Signup scopes & setup extras
    const scope = "whatsapp_business_management,whatsapp_business_messaging";
    const extras = encodeURIComponent(JSON.stringify({
      setup: {
        transport: "session",
        packages: ["whatsapp"]
      }
    }));

    const url = `https://www.facebook.com/v23.0/dialog/oauth?client_id=${metaAppId.trim()}&redirect_uri=${redirectUri}${configParam}&state=${state}&response_type=code&scope=${scope}&extras=${extras}`;
    
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      url,
      "Facebook Login for Business",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
    
    toast({
      title: "Meta OAuth Window Launched",
      description: "Ensure your Meta Developer App is configured in Live mode to authenticate your WhatsApp account.",
    });
  };

  const updateBusiness = useMutation({
    mutationFn: async (overrideFields?: Record<string, any>) => {
      const payload = {
        name,
        contact_email: contactEmail,
        bank_name: bankName,
        bank_account_number: bankAccountNumber,
        bank_account_holder: bankAccountHolder,
        bank_branch: bankBranch,
        bank_swift_code: bankSwiftCode,
        payment_gateway_link: paymentGatewayLink,
        payment_gateway_name: paymentGatewayName,
        business_type: businessType,
        description,
        slogan,
        logo_url: logoUrl,
        contact_phone: whatsappPhone,
        whatsapp_phone_number_id: whatsappPhoneNumberId,
        whatsapp_token: whatsappToken,
        meta_app_id: metaAppId,
        meta_config_id: metaConfigId,
        ai_enabled: aiEnabled,
        ai_model: aiModel,
        ai_system_prompt: aiSystemPrompt,
        ai_business_description: aiBusinessDescription,
        ai_faq_data: aiFaqData,
        ai_bot_name: aiBotName,
        ai_dealership_name: aiDealershipName,
        ai_greeting_message: aiGreetingMessage,
        ai_tone: aiTone,
        ai_language: aiLanguage,
        ai_emoji_usage: aiEmojiUsage,
        ai_ask_name_rule: aiAskNameRule,
        ai_ask_budget_rule: aiAskBudgetRule,
        ai_unanswered_limit: aiUnansweredLimit,
        ai_objections: aiObjections,
        ...overrideFields
      };

      const res = await fetch("http://localhost:5001/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update settings");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business"] }); toast({ title: "Settings and AI Agent trained successfully" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file); // We reuse the avatar/image upload endpoint or similar

    try {
      // The backend actually has a generic upload endpoint or we can use the avatar endpoint.
      // Wait, let's use the standard POST to /api/users/${user.id}/avatar for simplicity and get an image URL.
      // Since it's local storage, we can just use it to host the image.
      const res = await fetch(`http://localhost:5001/api/users/${user?.id || 1}/avatar`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setLogoUrl(data.avatar_url);
        toast({ title: "Logo uploaded successfully" });
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "An error occurred during upload", variant: "destructive" });
    }
  };

  if (['accountant', 'staff', 'sales'].includes(user?.role || "")) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold font-display text-rose-600">Unauthorized Access</h2>
        <p className="text-xs text-muted-foreground max-w-xs uppercase tracking-widest font-bold">Role: {user?.role}</p>
        <p className="text-sm text-muted-foreground max-w-xs">Only Owners and Admins have permission to modify business configurations.</p>
        <Button variant="outline" onClick={() => window.history.back()} className="mt-4 border-2 font-bold h-10">Go Back to Safety</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your business configuration</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="bg-background border border-border p-0.5 rounded-lg h-auto">
          <TabsTrigger value="business" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><Building2 className="h-3.5 w-3.5" />Business</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><MessageSquare className="h-3.5 w-3.5" />WhatsApp</TabsTrigger>
          <TabsTrigger value="ai-agent" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><Brain className="h-3.5 w-3.5" />AI Agent</TabsTrigger>
          <TabsTrigger value="voice" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><PhoneCall className="h-3.5 w-3.5" />Voice AI</TabsTrigger>
          <TabsTrigger value="plans" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><CreditCard className="h-3.5 w-3.5" />Plans</TabsTrigger>
          <TabsTrigger value="team" className="gap-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5"><Users className="h-3.5 w-3.5" />Team</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6">
          <SectionCard title="Business Profile" desc="Update your business information">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slogan</Label>
              <Input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="e.g. Delivering Dreams..." className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Logo</Label>
              <div className="flex gap-4 items-center">
                {logoUrl && <img src={`http://localhost:5001${logoUrl.replace('http://localhost:5001', '')}`} alt="Logo" className="w-12 h-12 object-contain rounded-md border" />}
                <Input type="file" accept="image/*" onChange={handleLogoUpload} className="h-9 text-sm w-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Business Type</Label>
              <Select onValueChange={setBusinessType} value={businessType || (business as any)?.business_type || ""}>
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
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Email</Label>
              <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Role:</Label>
              <Badge variant="outline" className="text-[11px] rounded-md px-2 py-0.5 font-medium bg-primary/5 text-primary border-primary/20">{userRole || "—"}</Badge>
            </div>
            {['owner', 'admin'].includes(user?.role) && (
              <Button onClick={() => updateBusiness.mutate(undefined)} disabled={updateBusiness.isPending} className="bg-primary text-white hover:bg-primary/90 text-sm h-9 mt-2 shadow-sm shadow-primary/20">
                Save Changes
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
          <div className="space-y-6">
            {/* Automatic Setup Option */}
            <SectionCard title="WhatsApp Connection" desc="Connect your profile automatically using Facebook Login">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Automatic & Recommended</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Share your WhatsApp Business account with <strong>Mohan Traders CRM</strong> instantly. Connect your existing number, contacts, and WhatsApp profiles.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Meta App ID</Label>
                    <Input 
                      placeholder="e.g. 1029384756102938" 
                      value={metaAppId} 
                      onChange={e => setMetaAppId(e.target.value)} 
                      className="h-9 text-sm bg-white" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Meta Config ID (Optional)</Label>
                    <Input 
                      placeholder="e.g. 982739827398273" 
                      value={metaConfigId} 
                      onChange={e => setMetaConfigId(e.target.value)} 
                      className="h-9 text-sm bg-white" 
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleFbEmbeddedSignup}
                  className="w-full bg-[#1877F2] text-white hover:bg-[#166FE5] flex items-center justify-center gap-2.5 font-semibold text-xs h-10 shadow-sm"
                >
                  <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Connect WhatsApp Business
                </Button>
              </div>
            </SectionCard>

            {/* Manual Setup Option */}
            <SectionCard title="Manual / Developer Setup" desc="Manually configure your WhatsApp Cloud API details">
              <p className="text-xs text-muted-foreground">For custom deployments, enter your WhatsApp Developer account details below.</p>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp Number (Contact Phone)</Label>
                <Input placeholder="+1234567890" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  WhatsApp Phone Number ID <span className="normal-case text-muted-foreground/60">(From Meta Developer Portal)</span>
                </Label>
                <Input placeholder="e.g. 1029384756..." value={whatsappPhoneNumberId} onChange={e => setWhatsappPhoneNumberId(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  WhatsApp Access Token <span className="normal-case text-muted-foreground/60">(System User Token / Permanent Token)</span>
                </Label>
                <Input 
                  type="password"
                  placeholder="Paste your WhatsApp Access Token (starts with EAA...)" 
                  value={whatsappToken} 
                  onChange={e => setWhatsappToken(e.target.value)} 
                  className="h-9 text-sm font-mono text-xs" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your Webhook URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={`${import.meta.env.VITE_SUPABASE_URL || 'https://nceyweiskamspdxfxnga.supabase.co'}/functions/v1/whatsapp-webhook`} className="h-9 text-sm font-mono text-xs" />
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL || 'https://nceyweiskamspdxfxnga.supabase.co'}/functions/v1/whatsapp-webhook`);
                    toast({ title: "Webhook URL copied" });
                  }}>Copy</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Copy this to your Meta App Configuration. Set Verify Token to: <code className="px-1 py-0.5 bg-primary/5 text-primary rounded text-[10px]">smartbiz_verify_token</code></p>
              </div>
              {['owner', 'admin'].includes(user?.role) && (
                <Button onClick={() => updateBusiness.mutate(undefined)} disabled={updateBusiness.isPending} className="bg-primary text-white hover:bg-primary/90 text-sm h-9 shadow-sm shadow-primary/20">
                  Save WhatsApp Settings
                </Button>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="ai-agent" className="mt-6">
          <div className="space-y-6">
            
            {/* WORKFLOW CANVAS CONTAINER */}
            <div className="border border-border rounded-xl bg-white overflow-hidden shadow-sm flex flex-col">
              
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-border bg-gradient-to-r from-primary/[0.03] via-transparent to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Chat Flow Builder (n8n Mode)
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Click on a workflow node below to configure its variables and rules</p>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 border-r border-border pr-4 mr-2">
                    <Label className="text-xs font-semibold text-muted-foreground">AI Responder Status</Label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={aiEnabled} 
                        onChange={e => {
                          const newVal = e.target.checked;
                          setAiEnabled(newVal);
                          updateBusiness.mutate({ ai_enabled: newVal });
                        }} 
                      />
                      <div className="w-10 h-5.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <Button 
                    type="button"
                    onClick={() => setIsSimOpen(!isSimOpen)}
                    className="h-8 px-3.5 bg-[#00a884] hover:bg-[#008f72] text-white text-xs font-bold flex items-center gap-1.5 rounded-full shadow-sm"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {isSimOpen ? "Close Simulator" : "Test Chat Flow"}
                  </Button>
                </div>
              </div>

              {/* Dotted Canvas Area */}
              <div 
                className="p-8 overflow-x-auto flex items-center justify-start gap-0 min-h-[160px] select-none relative border-b border-border" 
                style={{
                  backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
                  backgroundSize: '18px 18px',
                  backgroundColor: '#fafafa'
                }}
              >
                <style>{`
                  @keyframes flowDash {
                    to {
                      stroke-dashoffset: -16;
                    }
                  }
                `}</style>
                
                {/* 1. WHATSAPP TRIGGER NODE */}
                <div 
                  onClick={() => setActiveNode("trigger")}
                  className={`group relative flex items-center gap-3 bg-white border-2 rounded-xl p-3.5 w-52 shrink-0 transition-all cursor-pointer ${
                    activeNode === "trigger" 
                      ? "border-emerald-500 ring-4 ring-emerald-500/10 shadow-md -translate-y-0.5" 
                      : "border-zinc-200 hover:border-emerald-400 hover:shadow-sm"
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  </div>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-800 leading-tight">WhatsApp Trigger</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate leading-none">On Incoming Message</p>
                  </div>
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                </div>

                <ConnectorLine active={activeNode === "trigger" || activeNode === "agent"} />

                {/* 2. AGENT PERSONA NODE */}
                <div 
                  onClick={() => setActiveNode("agent")}
                  className={`group relative flex items-center gap-3 bg-white border-2 rounded-xl p-3.5 w-52 shrink-0 transition-all cursor-pointer ${
                    activeNode === "agent" 
                      ? "border-indigo-500 ring-4 ring-indigo-500/10 shadow-md -translate-y-0.5" 
                      : "border-zinc-200 hover:border-indigo-400 hover:shadow-sm"
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  </div>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                    <Brain className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-800 leading-tight">AI Sales Agent</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate leading-none">Name: {aiBotName}</p>
                  </div>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-sm" />
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-sm" />
                </div>

                <ConnectorLine active={activeNode === "agent" || activeNode === "rules"} />

                {/* 3. LEAD CAPTURE RULES NODE */}
                <div 
                  onClick={() => setActiveNode("rules")}
                  className={`group relative flex items-center gap-3 bg-white border-2 rounded-xl p-3.5 w-52 shrink-0 transition-all cursor-pointer ${
                    activeNode === "rules" 
                      ? "border-blue-500 ring-4 ring-blue-500/10 shadow-md -translate-y-0.5" 
                      : "border-zinc-200 hover:border-blue-400 hover:shadow-sm"
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  </div>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 border border-blue-100/50">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-800 leading-tight">Lead Capture Rules</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate leading-none">Name: {aiAskNameRule}</p>
                  </div>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                </div>

                <ConnectorLine active={activeNode === "rules" || activeNode === "objections"} />

                {/* 4. OBJECTION ROUTER NODE */}
                <div 
                  onClick={() => setActiveNode("objections")}
                  className={`group relative flex items-center gap-3 bg-white border-2 rounded-xl p-3.5 w-52 shrink-0 transition-all cursor-pointer ${
                    activeNode === "objections" 
                      ? "border-rose-500 ring-4 ring-rose-500/10 shadow-md -translate-y-0.5" 
                      : "border-zinc-200 hover:border-rose-400 hover:shadow-sm"
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  </div>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 text-rose-600 border border-rose-100/50">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-800 leading-tight">Objections Handler</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate leading-none">{aiObjections.length} rules active</p>
                  </div>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
                </div>

                <ConnectorLine active={activeNode === "objections" || activeNode === "knowledge"} />

                {/* 5. KNOWLEDGE BASE NODE */}
                <div 
                  onClick={() => setActiveNode("knowledge")}
                  className={`group relative flex items-center gap-3 bg-white border-2 rounded-xl p-3.5 w-52 shrink-0 transition-all cursor-pointer ${
                    activeNode === "knowledge" 
                      ? "border-amber-500 ring-4 ring-amber-500/10 shadow-md -translate-y-0.5" 
                      : "border-zinc-200 hover:border-amber-400 hover:shadow-sm"
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  </div>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 border border-amber-100/50">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-800 leading-tight">Inventory & FAQ</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate leading-none">{aiFaqData.length} FAQs | {aiVehicles.length} cars</p>
                  </div>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
                </div>

                <ConnectorLine active={activeNode === "knowledge" || activeNode === "respond"} />

                {/* 6. SEND RESPONSE NODE */}
                <div 
                  onClick={() => setActiveNode("respond")}
                  className={`group relative flex items-center gap-3 bg-white border-2 rounded-xl p-3.5 w-52 shrink-0 transition-all cursor-pointer ${
                    activeNode === "respond" 
                      ? "border-cyan-500 ring-4 ring-cyan-500/10 shadow-md -translate-y-0.5" 
                      : "border-zinc-200 hover:border-cyan-400 hover:shadow-sm"
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  </div>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-cyan-50 text-cyan-600 border border-cyan-100/50">
                    <Send className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-zinc-800 leading-tight">Send Response</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate leading-none">Smart Reply JSON</p>
                  </div>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-white shadow-sm" />
                </div>

              </div>
            </div>

            {/* TWO COLUMN GRID FOR EDITOR + SIMULATOR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Properties Editor Panel */}
              <div className={isSimOpen ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"}>
                
                {/* 1. TRIGGER CONFIG */}
                {activeNode === "trigger" && (
                  <SectionCard title="WhatsApp Trigger Settings" desc="Review configuration parameters for the WhatsApp Incoming Message trigger node">
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs uppercase tracking-wide">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          System Webhook Active
                        </div>
                        <p className="text-xs text-emerald-700 leading-normal font-sans">
                          This node executes automatically whenever an incoming text message is received by your Meta WhatsApp Developer number.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold">Your Webhook URL</Label>
                        <div className="flex gap-2">
                          <Input readOnly value={`${import.meta.env.VITE_SUPABASE_URL || 'https://nceyweiskamspdxfxnga.supabase.co'}/functions/v1/whatsapp-webhook`} className="h-9 text-xs font-mono bg-zinc-50" />
                          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => {
                            navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL || 'https://nceyweiskamspdxfxnga.supabase.co'}/functions/v1/whatsapp-webhook`);
                            toast({ title: "Webhook URL copied" });
                          }}>Copy</Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-semibold">Verify Token</Label>
                        <Input readOnly value="smartbiz_verify_token" className="h-9 text-xs font-mono bg-zinc-50" />
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* 2. AGENT PERSONA CONFIG */}
                {activeNode === "agent" && (
                  <div className="space-y-6">
                    <SectionCard title="AI Agent Persona Settings" desc="Edit the identity, greeting messages, and basic conversation tone guidelines">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Bot Name</Label>
                            <Input 
                              placeholder="e.g. Alex" 
                              value={aiBotName} 
                              onChange={e => setAiBotName(e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Dealership Name</Label>
                            <Input 
                              placeholder="e.g. Mohan Trading" 
                              value={aiDealershipName} 
                              onChange={e => setAiDealershipName(e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-semibold">Greeting message (first thing customers see)</Label>
                          <Textarea 
                            placeholder="e.g. Hi! I'm Alex from Mohan Trading showroom..." 
                            value={aiGreetingMessage} 
                            onChange={e => setAiGreetingMessage(e.target.value)}
                            className="min-h-[70px] text-sm"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Tone</Label>
                            <Select value={aiTone} onValueChange={setAiTone}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select Tone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Professional & warm">Professional & warm</SelectItem>
                                <SelectItem value="Energetic & friendly">Energetic & friendly</SelectItem>
                                <SelectItem value="Direct & sales-focused">Direct & sales-focused</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Language</Label>
                            <Select value={aiLanguage} onValueChange={setAiLanguage}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select Language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="Sinhala">Sinhala</SelectItem>
                                <SelectItem value="Bilingual (Sinhala & English)">Bilingual (Sinhala & English)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-semibold">Emoji Usage</Label>
                            <Select value={aiEmojiUsage} onValueChange={setAiEmojiUsage}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select Emoji Usage" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Use emojis — feels friendly">Use emojis — feels friendly</SelectItem>
                                <SelectItem value="No emojis — keep it professional">No emojis — keep it professional</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-semibold">Custom System Prompt / Instructions (Optional)</Label>
                          <Textarea 
                            placeholder="Add secondary prompt instructions here..." 
                            value={aiSystemPrompt} 
                            onChange={e => setAiSystemPrompt(e.target.value)}
                            className="min-h-[90px] text-sm"
                          />
                        </div>
                      </div>
                    </SectionCard>

                    {/* Preview box */}
                    <div className="border border-border rounded-xl p-5 bg-background/30 space-y-3">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Compiled Prompt Summary Preview</h4>
                      <div className="p-3 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono leading-relaxed border border-zinc-700">
                        You are {aiBotName}, a {aiTone.toLowerCase()} sales representative at {aiDealershipName}. Language style: {aiLanguage}. Emoji usage style: {aiEmojiUsage}. Greeting: "{aiGreetingMessage}".
                      </div>
                    </div>

                    <Button 
                      onClick={() => updateBusiness.mutate(undefined)} 
                      disabled={updateBusiness.isPending} 
                      className="w-full bg-primary text-white hover:bg-primary/90 text-sm h-10 shadow-md shadow-primary/20 flex items-center justify-center gap-2 font-semibold"
                    >
                      {updateBusiness.isPending ? "Saving..." : "Save Agent Settings"}
                    </Button>
                  </div>
                )}

                {/* 3. LEAD CAPTURE RULES CONFIG */}
                {activeNode === "rules" && (
                  <div className="space-y-6">
                    <SectionCard title="Lead Capture Rules Settings" desc="Configure rules for automatically asking customer contact names and budget criteria">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-semibold">Always ask for customer name by message</Label>
                          <Select value={aiAskNameRule} onValueChange={setAiAskNameRule}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select rule" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1st message">1st message</SelectItem>
                              <SelectItem value="2nd message">2nd message</SelectItem>
                              <SelectItem value="3rd message">3rd message</SelectItem>
                              <SelectItem value="Never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-semibold">Always ask for budget by message</Label>
                          <Select value={aiAskBudgetRule} onValueChange={setAiAskBudgetRule}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select rule" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2nd message">2nd message</SelectItem>
                              <SelectItem value="3rd message">3rd message</SelectItem>
                              <SelectItem value="4th message">4th message</SelectItem>
                              <SelectItem value="Never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-semibold">After how many unanswered messages, stop following up?</Label>
                          <Select value={aiUnansweredLimit} onValueChange={setAiUnansweredLimit}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select limit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1 follow-up then stop">1 follow-up then stop</SelectItem>
                              <SelectItem value="2 follow-ups then stop">2 follow-ups then stop</SelectItem>
                              <SelectItem value="3 follow-ups then stop">3 follow-ups then stop</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </SectionCard>

                    <Button 
                      onClick={() => updateBusiness.mutate(undefined)} 
                      disabled={updateBusiness.isPending} 
                      className="w-full bg-primary text-white hover:bg-primary/90 text-sm h-10 shadow-md shadow-primary/20 flex items-center justify-center gap-2 font-semibold"
                    >
                      {updateBusiness.isPending ? "Saving..." : "Save Sales Rules"}
                    </Button>
                  </div>
                )}

                {/* 4. OBJECTIONS CONFIG */}
                {activeNode === "objections" && (
                  <div className="space-y-6">
                    <SectionCard title="Objections Response Guidelines" desc="Train the AI agent on how to counter client price complaints, discount requests, or leasing details">
                      <div className="space-y-4">
                        <div className="p-4 border border-zinc-200 bg-zinc-50 rounded-xl space-y-3.5">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-primary">Add Objection Mapping Rule</p>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">If customer objects / asks about:</Label>
                            <Input 
                              placeholder="e.g. Price is too high, discount request, leasing options..." 
                              value={newObjection} 
                              onChange={e => setNewObjection(e.target.value)}
                              className="h-8.5 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">The AI should answer with:</Label>
                            <Textarea 
                              placeholder="e.g. Explain that we provide premium vehicle inspection certificates, flexible bank partnerships, and 12-month leasing options." 
                              value={newObjectionResponse} 
                              onChange={e => setNewObjectionResponse(e.target.value)}
                              className="min-h-[60px] text-xs bg-white resize-none"
                            />
                          </div>
                          <Button 
                            type="button"
                            onClick={() => {
                              if (!newObjection.trim() || !newObjectionResponse.trim()) return;
                              setAiObjections([...aiObjections, { objection: newObjection.trim(), response: newObjectionResponse.trim() }]);
                              setNewObjection("");
                              setNewObjectionResponse("");
                              toast({ title: "Objection guide queued. Click Save below to apply changes." });
                            }}
                            disabled={!newObjection.trim() || !newObjectionResponse.trim()}
                            className="h-8 text-xs bg-primary text-white flex items-center gap-1 font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Rule
                          </Button>
                        </div>

                        {/* List */}
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {aiObjections.map((obj, index) => (
                            <div key={index} className="group relative p-3 border border-border bg-background/50 rounded-xl hover:border-primary/20 hover:bg-white transition-all">
                              <p className="text-xs font-semibold text-foreground pr-6 flex items-start gap-1">
                                <span className="text-rose-500 font-bold shrink-0">Objection:</span> "{obj.objection}"
                              </p>
                              <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1 font-sans">
                                <span className="text-primary font-bold shrink-0">Target Response:</span> "{obj.response}"
                              </p>
                              <button 
                                type="button"
                                onClick={() => {
                                  const updated = aiObjections.filter((_, i) => i !== index);
                                  setAiObjections(updated);
                                  toast({ title: "Objection rule removed" });
                                }}
                                className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full border bg-white hover:bg-rose-50 text-muted-foreground hover:text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {aiObjections.length === 0 && (
                            <p className="text-center py-6 text-xs text-muted-foreground italic">No custom objection guides defined yet.</p>
                          )}
                        </div>
                      </div>
                    </SectionCard>

                    <Button 
                      onClick={() => updateBusiness.mutate(undefined)} 
                      disabled={updateBusiness.isPending} 
                      className="w-full bg-primary text-white hover:bg-primary/90 text-sm h-10 shadow-md shadow-primary/20 flex items-center justify-center gap-2 font-semibold"
                    >
                      {updateBusiness.isPending ? "Saving..." : "Save Objection Rules"}
                    </Button>
                  </div>
                )}

                {/* 5. KNOWLEDGE BASE CONFIG */}
                {activeNode === "knowledge" && (
                  <div className="space-y-6">
                    <SectionCard title="Dealer Inventory Training Notes" desc="Configure specific highlights or leasing options for cars in stock">
                      <div className="space-y-4">
                        <div className="flex gap-2 items-center justify-between pb-2 border-b">
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Showroom stock list ({aiVehicles.length} vehicles)</span>
                          <div className="relative w-48">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                              placeholder="Search stock..." 
                              value={searchCar} 
                              onChange={e => setSearchCar(e.target.value)} 
                              className="pl-8 h-7 text-[10px]"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {aiVehicles.filter(v => v.brand.toLowerCase().includes(searchCar.toLowerCase())).map(car => (
                            <div key={car.id} className="border border-border rounded-xl p-3 bg-zinc-50 hover:bg-white transition-all flex flex-col justify-between space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-xs text-foreground leading-normal">{car.brand}</h4>
                                  <span className="text-[9px] text-muted-foreground bg-zinc-100 px-1.5 py-0.5 rounded inline-block mt-1 font-sans">{car.category || 'Vehicle'}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-primary font-sans">LKR {parseFloat(car.price).toLocaleString()}</p>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-zinc-200">
                                {editingVehicleNotesId === car.id ? (
                                  <div className="space-y-1.5">
                                    <Textarea 
                                      placeholder="AI instructions for this model..." 
                                      value={vehicleNotesInput} 
                                      onChange={e => setVehicleNotesInput(e.target.value)} 
                                      className="min-h-[50px] text-[10px] bg-white resize-none"
                                    />
                                    <div className="flex gap-1.5">
                                      <Button 
                                        size="sm" 
                                        onClick={() => saveVehicleNotes(car.id, vehicleNotesInput)} 
                                        disabled={isSavingVehicleNotes}
                                        className="h-6 text-[10px] bg-primary text-white"
                                      >
                                        {isSavingVehicleNotes ? "Saving..." : "Save"}
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled={isSavingVehicleNotes}
                                        onClick={() => setEditingVehicleNotesId(null)} 
                                        className="h-6 text-[10px]"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground">AI Instructions</span>
                                      <button onClick={() => { setEditingVehicleNotesId(car.id); setVehicleNotesInput(car.ai_notes || ""); }} className="text-[9px] text-primary hover:underline font-bold">Edit</button>
                                    </div>
                                    <p className="text-[10px] text-zinc-700 leading-normal min-h-[20px] font-sans">
                                      {car.ai_notes ? car.ai_notes : <span className="italic text-muted-foreground/60">No guidelines. AI uses default details.</span>}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title="FAQ Knowledge Base Settings" desc="Add general brand question and target answer pairs to train the AI memory">
                      <div className="space-y-4">
                        <div className="p-4 border border-zinc-200 bg-zinc-50 rounded-xl space-y-3">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-primary">Add New FAQ Pair</p>
                          <div className="space-y-1">
                            <Input 
                              placeholder="Question (e.g. Do you offer car insurance?)" 
                              value={newQuestion} 
                              onChange={e => setNewQuestion(e.target.value)}
                              className="h-8.5 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <Textarea 
                              placeholder="Target Answer..." 
                              value={newAnswer} 
                              onChange={e => setNewAnswer(e.target.value)}
                              className="min-h-[50px] text-xs bg-white resize-none"
                            />
                          </div>
                          <Button 
                            type="button"
                            onClick={() => {
                              if (!newQuestion.trim() || !newAnswer.trim()) return;
                              setAiFaqData([...aiFaqData, { q: newQuestion.trim(), a: newAnswer.trim() }]);
                              setNewQuestion("");
                              setNewAnswer("");
                              toast({ title: "FAQ added to queue. Click Save below to apply." });
                            }}
                            disabled={!newQuestion.trim() || !newAnswer.trim()}
                            className="h-8 text-xs bg-primary text-white flex items-center gap-1 font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add FAQ Block
                          </Button>
                        </div>

                        {/* List */}
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {aiFaqData.map((faq, index) => (
                            <div key={index} className="group relative p-3 border border-border bg-background/50 rounded-xl hover:border-primary/20 hover:bg-white transition-all">
                              <p className="text-xs font-semibold text-foreground pr-6 flex items-start gap-1">
                                <span className="text-primary font-bold">Q:</span> {faq.q}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1 font-sans">
                                <span className="text-emerald-600 font-bold">A:</span> {faq.a}
                              </p>
                              <button 
                                type="button"
                                onClick={() => {
                                  const updated = aiFaqData.filter((_, i) => i !== index);
                                  setAiFaqData(updated);
                                  toast({ title: "FAQ block removed" });
                                }}
                                className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full border bg-white hover:bg-rose-50 text-muted-foreground hover:text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          {aiFaqData.length === 0 && (
                            <p className="text-center py-6 text-xs text-muted-foreground italic">No custom FAQ blocks configured yet.</p>
                          )}
                        </div>
                      </div>
                    </SectionCard>

                    <Button 
                      onClick={() => updateBusiness.mutate(undefined)} 
                      disabled={updateBusiness.isPending} 
                      className="w-full bg-primary text-white hover:bg-primary/90 text-sm h-10 shadow-md shadow-primary/20 flex items-center justify-center gap-2 font-semibold"
                    >
                      {updateBusiness.isPending ? "Saving..." : "Save Showroom & FAQ Data"}
                    </Button>
                  </div>
                )}

                {/* 6. RESPONSE SCHEMA CONFIG */}
                {activeNode === "respond" && (
                  <SectionCard title="Send Response Node Settings" desc="Inspect the JSON structure template for the final output action response payload">
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground font-sans">
                        The AI generates a response conforming strictly to the following JSON structure schema, enabling automated lead capture and real-time CRM updates.
                      </p>
                      <pre className="p-4 bg-zinc-800 text-zinc-300 rounded-xl text-[11px] font-mono leading-relaxed border border-zinc-700 overflow-x-auto">
{`{
  "reply": "Your conversational response here...",
  "extracted_info": {
    "name": "Customer's name (or null)",
    "interested_car": "Model / Category (or null)",
    "budget": "LKR budget range (or null)",
    "status": "New | Warm | Hot | Cold"
  }
}`}
                      </pre>
                    </div>
                  </SectionCard>
                )}

              </div>

              {/* Chat Simulator Right Split Panel */}
              {isSimOpen && (
                <div className="lg:col-span-5 border border-border rounded-xl bg-zinc-100 overflow-hidden shadow-sm sticky top-6">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075e54] text-white p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-teal-800 flex items-center justify-center font-bold text-sm select-none">
                        {aiBotName.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs leading-none">{aiBotName}</h4>
                        <span className="text-[9px] text-teal-100/90 mt-1 inline-block">Online • Active model: {aiModel.split('/').pop()}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSimMessages([{ sender: 'bot', content: `Hi! I'm ${aiBotName} from ${aiDealershipName} 👋 Looking for your dream car? Tell me what you have in mind!` }])}
                      className="h-8 w-8 text-teal-100 hover:text-white hover:bg-teal-800 rounded-full"
                      title="Reset Chat"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* WhatsApp Messages Box */}
                  <div className="h-[360px] overflow-y-auto p-4 space-y-3 bg-[#ece5dd] bg-opacity-95" id="sim-message-box">
                    {simMessages.map((msg, index) => (
                      <div 
                        key={index}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] rounded-lg p-2.5 text-xs shadow-sm relative leading-relaxed ${
                            msg.sender === 'user' 
                              ? 'bg-[#d9fdd3] text-zinc-955 rounded-tr-none' 
                              : 'bg-white text-zinc-955 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line font-sans">{msg.content}</p>
                          <span className="text-[8px] text-muted-foreground float-right mt-1 ml-2 select-none">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isSimLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white rounded-lg p-3 text-xs shadow-sm rounded-tl-none flex items-center gap-1.5 text-muted-foreground select-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Input Form */}
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!simInput.trim() || isSimLoading) return;
                      const userText = simInput.trim();
                      setSimMessages(prev => [...prev, { sender: 'user', content: userText }]);
                      setSimInput("");
                      setIsSimLoading(true);

                      try {
                        const formattedHistory = simMessages.slice(1).map(m => ({
                          sender: m.sender === 'user' ? 'customer' : 'bot',
                          content: m.content
                        }));

                        const res = await fetch("http://localhost:5001/api/settings/test-chat", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userMessage: userText,
                            ai_system_prompt: aiSystemPrompt,
                            ai_business_description: aiBusinessDescription,
                            ai_faq_data: aiFaqData,
                            ai_model: aiModel,
                            chatHistory: formattedHistory,
                            ai_bot_name: aiBotName,
                            ai_dealership_name: aiDealershipName,
                            ai_greeting_message: aiGreetingMessage,
                            ai_tone: aiTone,
                            ai_language: aiLanguage,
                            ai_emoji_usage: aiEmojiUsage,
                            ai_ask_name_rule: aiAskNameRule,
                            ai_ask_budget_rule: aiAskBudgetRule,
                            ai_unanswered_limit: aiUnansweredLimit,
                            ai_objections: aiObjections
                          })
                        });
                        const data = await res.json();
                        if (res.ok && data.reply) {
                          setSimMessages(prev => [...prev, { sender: 'bot', content: data.reply }]);
                          
                          if (data.extracted_info) {
                            const info = data.extracted_info;
                            const detected = [];
                            if (info.name) detected.push(`Name: ${info.name}`);
                            if (info.interested_car) detected.push(`Car: ${info.interested_car}`);
                            if (info.budget) detected.push(`Budget: ${info.budget}`);
                            if (info.status) detected.push(`Status: ${info.status}`);
                            if (detected.length > 0) {
                              toast({
                                title: "🔍 Extracted Lead Info",
                                description: detected.join(" | "),
                              });
                            }
                          }
                        } else {
                          setSimMessages(prev => [...prev, { sender: 'bot', content: "Failed to generate reply. Check your connection or API keys." }]);
                        }
                      } catch (err) {
                        console.error(err);
                        setSimMessages(prev => [...prev, { sender: 'bot', content: "Error communicating with the test endpoint." }]);
                      } finally {
                        setIsSimLoading(false);
                        setTimeout(() => {
                          const box = document.getElementById("sim-message-box");
                          if (box) box.scrollTop = box.scrollHeight;
                        }, 50);
                      }
                    }}
                    className="bg-[#f0f2f5] p-2.5 flex items-center gap-2 border-t border-zinc-200"
                  >
                    <Input 
                      placeholder="Type a test message to agent..."
                      value={simInput}
                      onChange={e => setSimInput(e.target.value)}
                      className="bg-white h-9.5 text-xs flex-1 rounded-full px-4 border-0 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                      disabled={isSimLoading}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!simInput.trim() || isSimLoading}
                      className="h-9.5 w-9.5 rounded-full bg-[#00a884] text-white hover:bg-[#008f72] flex items-center justify-center shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              )}

          </div>
        </div>
      </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "Starter", price: "$45", features: ["WhatsApp automation", "Basic analytics", "Up to 100 customers"] },
              { name: "Growth", price: "$79", features: ["AI recommendations", "Advanced analytics", "Unlimited customers", "Priority support"] },
              { name: "Pro", price: "$199", features: ["Demand prediction", "Voice AI readiness", "Dedicated support", "Custom integrations"] },
            ].map(plan => (
              <div key={plan.name} className={`relative border rounded-lg bg-white overflow-hidden ${plan.name === "Starter" ? "border-primary shadow-sm shadow-primary/10 ring-1 ring-primary/20" : "border-border"}`}>
                {plan.name === "Growth" && (
                  <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-3 py-1 text-[10px] font-bold tracking-wide uppercase rounded-bl-lg">
                    Popular
                  </div>
                )}
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-foreground">{plan.name}</h3>
                    {plan.name === "Starter" && <Badge className="bg-primary/10 text-primary text-[10px] border-0">Active</Badge>}
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
                    variant={plan.name === "Starter" ? "default" : "outline"}
                    className={`w-full mt-5 text-sm h-9 ${plan.name === "Starter" ? "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20" : ""}`}
                  >
                    {plan.name === "Starter" ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <SectionCard title="Team Members" desc="Manage team access and roles. 'Owner' has full access. 'Staff' can only see Vehicles, Leads, and Chat.">
            <TeamManager isOwner={user?.role === 'owner'} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
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
}

const ConnectorLine = ({ active }: { active?: boolean }) => (
  <div className="shrink-0 flex items-center justify-center -mx-1.5 z-0 select-none">
    <svg width="36" height="24" viewBox="0 0 36 24" className="overflow-visible">
      {/* Background track */}
      <path 
        d="M 0 12 Q 18 12, 36 12" 
        fill="none" 
        stroke={active ? "rgba(99, 102, 241, 0.15)" : "#e4e4e7"} 
        strokeWidth="3.5" 
        strokeLinecap="round"
      />
      {/* Animated flow track */}
      <path 
        d="M 0 12 Q 18 12, 36 12" 
        fill="none" 
        stroke={active ? "var(--primary)" : "#a1a1aa"} 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeDasharray={active ? "6 10" : "none"}
        className={active ? "animate-[flowDash_1s_linear_infinite]" : ""}
      />
    </svg>
  </div>
);
