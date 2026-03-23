import { useState, useEffect, useRef } from "react";
import { Loader2, Send, Bot, User, Car, MessageSquare, RefreshCw, Wifi, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = import.meta.env.VITE_PHONE_NUMBER_ID;

export default function ChatPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const isElevated = user?.role === 'owner' || user?.role === 'admin';

  // ── Fetch all leads ──────────────────────────────────────────────
  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error && data) setLeads(data);
    setLoadingLeads(false);
  };

  // ── Fetch messages for a lead ───────────────────────────────────
  const fetchMessages = async (leadId: number) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });
    if (!error && data) setMessages(data);
    setLoadingMessages(false);
  };

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    fetchLeads();
  }, []);

  // ── Supabase Real-time subscription for messages ─────────────────
  useEffect(() => {
    if (!selectedLead) return;

    const channel = supabase
      .channel(`messages-lead-${selectedLead.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `lead_id=eq.${selectedLead.id}` },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [selectedLead?.id]);

  // ── Supabase Real-time for leads list (new WhatsApp leads) ───────
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Auto-scroll to bottom ────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectLead = (lead: any) => {
    setSelectedLead(lead);
    fetchMessages(lead.id);
  };

  // ── Send message via WhatsApp + save to DB ───────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLead || sending) return;
    setSending(true);

    const content = newMessage.trim();
    setNewMessage("");

    // 1. Optimistic UI update
    const optimistic = { id: Date.now(), sender: "sales", content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // 2. Save to Supabase
      await supabase.from("messages").insert({
        lead_id: selectedLead.id,
        sender: "sales",
        content,
      });

      // 3. Send via WhatsApp API (if token configured)
      if (WHATSAPP_TOKEN && PHONE_NUMBER_ID && selectedLead.phone) {
        await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: selectedLead.phone,
            type: "text",
            text: { body: content },
          }),
        });
      }
    } catch (err) {
      console.error("Send error:", err);
    }

    setSending(false);
  };

  const handleDeleteConversation = async () => {
    if (!selectedLead || !isElevated) return;
    if (!window.confirm("Are you sure you want to delete this entire conversation? This cannot be undone.")) return;
    
    try {
      await supabase.from("messages").delete().eq("lead_id", selectedLead.id);
      await supabase.from("leads").delete().eq("id", selectedLead.id);
      setSelectedLead(null);
      setMessages([]);
      fetchLeads();
    } catch (err) {
      console.error("Delete conversation error:", err);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!isElevated) return;
    if (!window.confirm("Delete this message?")) return;
    try {
      await supabase.from("messages").delete().eq("id", msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Delete message error:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "hot":       return "bg-red-100 text-red-700";
      case "warm":      return "bg-amber-100 text-amber-700";
      case "new":       return "bg-blue-100 text-blue-700";
      case "contacted": return "bg-violet-100 text-violet-700";
      default:          return "bg-muted text-muted-foreground";
    }
  };

  const getSenderStyle = (sender: string) => {
    switch (sender) {
      case "sales": return "bg-primary text-white rounded-br-md";
      case "bot":   return "bg-primary/80 text-white rounded-br-md";
      default:      return "bg-white border border-border text-foreground rounded-bl-md shadow-sm";
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* ── Sidebar: Leads List ────────────────────────────── */}
      <div className="w-[300px] shrink-0 flex flex-col border border-border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Conversations</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{leads.length} active leads</p>
            </div>
            <button
              onClick={fetchLeads}
              className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingLeads ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No leads yet</div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleSelectLead(lead)}
                className={`px-4 py-3.5 border-b border-border/50 cursor-pointer transition-all duration-150 ${
                  selectedLead?.id === lead.id ? "bg-primary text-white" : "hover:bg-primary/[0.03]"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className={`font-semibold text-sm truncate ${selectedLead?.id === lead.id ? "text-white" : "text-foreground"}`}>
                    {lead.name || "WhatsApp User"}
                  </span>
                  <span className={`text-[10px] shrink-0 ${selectedLead?.id === lead.id ? "text-white/60" : "text-muted-foreground"}`}>
                    {new Date(lead.updated_at || lead.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                </div>
                <div className={`text-[11px] font-mono mt-0.5 ${selectedLead?.id === lead.id ? "text-white/70" : "text-muted-foreground"}`}>
                  +{lead.phone}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`flex items-center gap-1 text-[10px] ${selectedLead?.id === lead.id ? "text-white/70" : "text-muted-foreground"}`}>
                    <Car className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lead.interested_car || "Any vehicle"}</span>
                  </div>
                  {lead.status && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                      selectedLead?.id === lead.id ? "bg-white/20 text-white" : getStatusColor(lead.status)
                    }`}>
                      {lead.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col border border-border rounded-xl bg-white overflow-hidden shadow-sm">
        {selectedLead ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-white">
              <div>
                <h3 className="font-semibold text-sm text-foreground">{selectedLead.name}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">+{selectedLead.phone}</p>
              </div>
              <div className="flex items-center gap-2">

                {selectedLead.budget && (
                  <Badge variant="outline" className="text-[10px] font-medium">
                    💰 {selectedLead.budget}
                  </Badge>
                )}
                {isElevated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteConversation}
                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 ml-1"
                    title="Delete Conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gradient-to-b from-background/30 to-background/10">
              {loadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                  <Bot className="h-8 w-8 opacity-20" />
                  <p className="text-xs">No messages yet.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "sales" || msg.sender === "bot" ? "justify-end" : "justify-start"}`}>
                    {/* Avatar */}
                    {(msg.sender !== "sales" && msg.sender !== "bot") && (
                      <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center mr-2 shrink-0 mt-1">
                        <User className="h-4 w-4 text-emerald-700" />
                      </div>
                    )}
                    <div className="group relative flex items-center w-fit max-w-[72%]">
                      {isElevated && msg.sender !== "bot" && msg.sender !== "sales" && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 absolute -right-8 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-opacity cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isElevated && (msg.sender === "bot" || msg.sender === "sales") && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 absolute -left-8 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-opacity cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 w-full ${getSenderStyle(msg.sender)}`}>
                        {msg.sender === "bot" && (
                          <div className="text-[9px] uppercase tracking-wider text-white/50 font-semibold mb-1 flex items-center gap-1">
                            <Bot className="h-2.5 w-2.5" /> AI Auto-Reply
                          </div>
                        )}
                        {msg.sender === "sales" && (
                          <div className="text-[9px] uppercase tracking-wider text-white/50 font-semibold mb-1">
                            Sales Team
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <span className={`text-[10px] mt-1 block ${
                          msg.sender === "sales" || msg.sender === "bot" ? "text-white/50 text-right" : "text-muted-foreground"
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    {/* Bot/Sales avatar */}
                    {(msg.sender === "sales" || msg.sender === "bot") && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center ml-2 shrink-0 mt-1">
                        {msg.sender === "bot" ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-white">
              <div className="flex items-center gap-3">
                <Input
                  placeholder={`Message ${selectedLead.name} via WhatsApp...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  className="flex-1 h-10 text-sm bg-background border-border rounded-full px-4"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="h-10 w-10 p-0 shrink-0 bg-primary text-white hover:bg-primary/90 rounded-full shadow-sm shadow-primary/20 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
            <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-primary/30" />
            </div>
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs max-w-[240px] text-center">
              All WhatsApp messages from leads automatically appear here in real-time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
