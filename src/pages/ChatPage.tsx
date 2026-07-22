import { useState, useEffect, useRef } from "react";
import { Loader2, Send, User, Car, RefreshCw, Trash2, Search, Phone, MoreVertical, Check, CheckCheck, MessagesSquare, ArrowLeft } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = import.meta.env.VITE_PHONE_NUMBER_ID;

const STATUS_COLORS: Record<string, string> = {
  hot:       "bg-red-100 text-red-700",
  warm:      "bg-amber-100 text-amber-700",
  new:       "bg-sky-100 text-sky-700",
  contacted: "bg-violet-100 text-violet-700",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-teal-500", "bg-emerald-500", "bg-cyan-600",
    "bg-indigo-500", "bg-purple-500", "bg-rose-500",
    "bg-orange-500", "bg-blue-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  if (phone === "SYSTEM_SETTINGS") return "SYSTEM_SETTINGS";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    return "94" + cleaned.substring(1);
  }
  return cleaned;
};

export default function ChatPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [supaLeadId, setSupaLeadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const isElevated = user?.role === "owner" || user?.role === "admin";

  const fetchLeads = async () => {
    try {
      // 1. Fetch from Supabase WhatsApp Leads to sync them locally
      const { data: supaLeads, error: supaErr } = await supabase.from('leads').select('*');
      if (!supaErr && supaLeads && supaLeads.length > 0) {
        await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: supaLeads })
        });
      }

      // 2. Fetch the newly merged data from main CRM
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
        setFiltered(data);
      }
    } catch (err) {
      console.error("Fetch leads error:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchMessages = async (lead: any) => {
    if (!lead) return;
    setLoadingMessages(true);
    try {
      // 1. Sync messages from Supabase if the lead has a phone number
      if (lead.phone) {
        const { data: supaLead } = await supabase
          .from("leads")
          .select("id")
          .eq("phone", normalizePhone(lead.phone))
          .maybeSingle();

        if (supaLead) {
          const { data: supaMessages } = await supabase
            .from("messages")
            .select("*")
            .eq("lead_id", supaLead.id);

          if (supaMessages && supaMessages.length > 0) {
            await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/messages/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lead_id: lead.id, messages: supaMessages })
            });
          }
        }
      }

      // 2. Fetch the newly merged messages from local backend
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/messages/lead/${lead.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(leads.filter((l) =>
      (l.name || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q) ||
      (l.interested_car || "").toLowerCase().includes(q)
    ));
  }, [search, leads]);

  // Real-time messages
  useEffect(() => {
    if (!selectedLead || !supaLeadId) return;
    const channel = supabase
      .channel(`messages-lead-${selectedLead.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `lead_id=eq.${supaLeadId}`,
      }, async (payload) => {
        // Sync the newly received message to local backend
        await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/messages/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: selectedLead.id, messages: [payload.new] })
        });

        // Sanitize the created_at timestamp to append 'Z' if it's missing (ensures proper UTC parsing)
        const sanitizedMsg: any = {
          ...payload.new,
          created_at: payload.new.created_at && typeof payload.new.created_at === "string" && !payload.new.created_at.endsWith("Z")
            ? payload.new.created_at + "Z"
            : payload.new.created_at
        };

        // Add to messages state directly
        setMessages((prev: any[]) => {
          if (prev.find((m: any) => m.id === sanitizedMsg.id || (m.content === sanitizedMsg.content && m.sender === sanitizedMsg.sender))) return prev;
          return [...prev, sanitizedMsg];
        });
      })
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); setIsLive(false); };
  }, [selectedLead?.id, supaLeadId]);

  // Real-time leads
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectLead = async (lead: any) => {
    setSelectedLead(lead);
    setSupaLeadId(null);
    
    // Fetch and sync messages
    await fetchMessages(lead);

    // Look up the Supabase Lead ID to establish real-time updates subscription
    if (lead.phone) {
      try {
        const { data: supaLead } = await supabase
          .from("leads")
          .select("id")
          .eq("phone", normalizePhone(lead.phone))
          .maybeSingle();
        if (supaLead) {
          setSupaLeadId(supaLead.id);
        }
      } catch (err) {
        console.error("Supabase lead ID lookup failed:", err);
      }
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLead || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    const optimistic = { id: Date.now(), sender: "sales", content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    try {
      // 1. Save to local database via Express API
      await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: selectedLead.id, sender: "sales", content })
      });

      // 2. Sync to Supabase using correct Supabase Lead ID
      if (supaLeadId) {
        await supabase.from("messages").insert({ lead_id: supaLeadId, sender: "sales", content });
      }

      // 3. Direct Meta Graph API trigger fallback
      if (WHATSAPP_TOKEN && PHONE_NUMBER_ID && selectedLead.phone) {
        await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: selectedLead.phone, type: "text", text: { body: content } }),
        });
      }
    } catch (err) { console.error("Send error:", err); }
    setSending(false);
  };

  const handleDeleteConversation = async () => {
    if (!selectedLead || !isElevated) return;
    if (!window.confirm("Delete this entire conversation? This cannot be undone.")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}`}/api/leads/${selectedLead.id}`, { method: "DELETE" });
      if (supaLeadId) {
        await supabase.from("messages").delete().eq("lead_id", supaLeadId);
        await supabase.from("leads").delete().eq("id", supaLeadId);
      }
      setSelectedLead(null);
      setMessages([]);
      fetchLeads();
    } catch (err) { console.error(err); }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!isElevated) return;
    if (!window.confirm("Delete this message?")) return;
    try {
      await supabase.from("messages").delete().eq("id", msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) { console.error(err); }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatListDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const activeLead = leads.find((l) => l.id === selectedLead?.id) || selectedLead;

  return (
    <div className="flex h-[calc(100vh-112px)] rounded-xl overflow-hidden border border-[#d1d7db] shadow-sm bg-white">

      {/* ── LEFT SIDEBAR ──────────────────────────────── */}
      <div className={`w-full md:w-[340px] md:shrink-0 flex flex-col border-r border-[#d1d7db] bg-white ${selectedLead ? "hidden md:flex" : "flex"}`}>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] border-b border-[#d1d7db] shrink-0 h-[59px]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {getInitials(user?.email || "MT")}
            </div>
            <span className="font-semibold text-[#111b21] text-sm">Mohan Traders</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchLeads}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#d1d7db]/60 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-[#54656f]" />
            </button>
            <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#d1d7db]/60 transition-colors">
              <MoreVertical className="h-4 w-4 text-[#54656f]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white">
          <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-full px-4 h-9">
            <Search className="h-4 w-4 text-[#54656f] shrink-0" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#111b21] placeholder:text-[#8696a0] outline-none"
            />
          </div>
        </div>

        {/* Lead count badge */}
        <div className="px-4 py-1.5 border-b border-[#f0f2f5]">
          <span className="text-[11px] font-medium text-[#8696a0] uppercase tracking-wider">
            {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingLeads ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#00a884]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#8696a0]">No conversations found</div>
          ) : (
            filtered.map((lead) => {
              const isActive = selectedLead?.id === lead.id;
              const initials = getInitials(lead.name || "?");
              const avatarBg = getAvatarColor(lead.name || "?");
              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLead(lead)}
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer border-b border-[#f0f2f5] transition-colors ${
                    isActive ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`h-12 w-12 rounded-full ${avatarBg} flex items-center justify-center shrink-0 text-white font-semibold text-sm`}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-medium text-[#111b21] text-[14.5px] truncate">{lead.name || "WhatsApp User"}</span>
                      <span className="text-[11px] text-[#8696a0] shrink-0 ml-1">{formatListDate(lead.updated_at || lead.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <Car className="h-3 w-3 text-[#8696a0] shrink-0" />
                        <span className="text-[12.5px] text-[#667781] truncate">{lead.interested_car || lead.phone}</span>
                      </div>
                      {lead.status && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase shrink-0 ${STATUS_COLORS[lead.status?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
                          {lead.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${selectedLead ? "flex" : "hidden md:flex"}`} style={{ background: "#efeae2" }}>
        {selectedLead ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] border-b border-[#d1d7db] shrink-0 h-[59px]">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="md:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#d1d7db]/60 text-[#54656f] mr-1 shrink-0"
                  title="Back to list"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className={`h-10 w-10 rounded-full ${getAvatarColor(activeLead.name || "?")} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                  {getInitials(activeLead.name || "?")}
                </div>
                <div>
                  <h3 className="font-semibold text-[#111b21] text-[14.5px] leading-tight">{activeLead.name}</h3>
                  <p className="text-[12px] text-[#667781]">
                    <span className="font-mono">+{activeLead.phone}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {activeLead.budget && (
                  <span className="text-[11px] bg-white border border-[#d1d7db] text-[#3b4a54] px-2 py-0.5 rounded-full font-medium mr-1">
                    💰 {activeLead.budget}
                  </span>
                )}
                <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#d1d7db]/60 transition-colors">
                  <Phone className="h-4 w-4 text-[#54656f]" />
                </button>
                {isElevated && (
                  <button
                    onClick={handleDeleteConversation}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50 text-[#54656f] hover:text-red-500 transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#d1d7db]/60 transition-colors">
                  <MoreVertical className="h-4 w-4 text-[#54656f]" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-4 space-y-1"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5ddd5'/%3E%3C/svg%3E")`,
              }}
            >
              {loadingMessages ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="h-5 w-5 animate-spin text-[#00a884]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="bg-white/80 rounded-lg px-5 py-3 text-center shadow-sm">
                    <p className="text-[13px] text-[#667781]">No messages yet</p>
                    <p className="text-[11px] text-[#8696a0] mt-0.5">Send the first message below</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOutgoing = msg.sender === "sales" || msg.sender === "bot";
                  const prevMsg = messages[idx - 1];
                  const showDateSep = idx === 0 ||
                    new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                  return (
                    <div key={msg.id}>
                      {/* Date separator */}
                      {showDateSep && (
                        <div className="flex justify-center my-3">
                          <span className="bg-white/80 text-[#667781] text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                            {new Date(msg.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-0.5`}>
                        <div className="group relative max-w-[85%] md:max-w-[65%]">
                          {/* Bubble */}
                          <div
                            className={`relative px-3 pt-1.5 pb-1 rounded-lg shadow-sm ${
                              isOutgoing
                                ? "bg-[#d9fdd3] rounded-tr-none"
                                : "bg-white rounded-tl-none"
                            }`}
                          >
                            {/* Sender label for bot */}
                            {isOutgoing && msg.sender === "bot" && (
                              <p className="text-[10px] font-semibold text-[#00a884] mb-0.5">Auto-Reply Bot</p>
                            )}
                            {isOutgoing && msg.sender === "sales" && (
                              <p className="text-[10px] font-semibold text-[#00a884] mb-0.5">Sales Team</p>
                            )}

                            <p className="text-[14px] text-[#111b21] leading-relaxed whitespace-pre-wrap pr-10">
                              {msg.content}
                            </p>

                            {/* Time + ticks */}
                            <div className="flex items-center justify-end gap-0.5 mt-0.5 -mb-0.5">
                              <span className="text-[11px] text-[#667781]">{formatTime(msg.created_at)}</span>
                              {isOutgoing && (
                                <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                              )}
                            </div>
                          </div>

                          {/* Delete button on hover */}
                          {isElevated && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className={`opacity-0 group-hover:opacity-100 absolute top-1 ${isOutgoing ? "-left-8" : "-right-8"} p-1.5 text-[#8696a0] hover:text-red-500 hover:bg-white rounded-full transition-all shadow-sm bg-white`}
                              title="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f2f5] border-t border-[#d1d7db]">
              <div className="flex-1 flex items-center bg-white rounded-full px-4 h-10 shadow-sm border border-[#d1d7db]/60">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  className="flex-1 bg-transparent text-[14px] text-[#111b21] placeholder:text-[#8696a0] outline-none"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="h-10 w-10 shrink-0 rounded-full bg-[#00a884] hover:bg-[#017c63] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: "#f8f9fa" }}>
            <div className="flex flex-col items-center gap-3 bg-white/60 rounded-2xl px-10 py-8 text-center shadow-sm">
              <div className="h-16 w-16 rounded-full bg-[#00a884]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-9 w-9 fill-[#00a884]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M11.998 2C6.478 2 2 6.478 2 12c0 1.85.504 3.58 1.38 5.065L2 22l5.085-1.33A9.953 9.953 0 0 0 12 22c5.522 0 10-4.478 10-10S17.52 2 11.998 2zm.002 18a7.946 7.946 0 0 1-4.32-1.27l-.31-.184-3.02.79.81-2.96-.2-.32A8 8 0 1 1 12 20z"/>
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#111b21]">Mohan Traders CRM</p>
                <p className="text-[13px] text-[#667781] mt-1 max-w-[260px]">
                  Select a conversation from the left to view Automated WhatsApp messages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8696a0]">
              <Check className="h-3 w-3" />
              <span>End-to-end encrypted • Real-time sync</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
