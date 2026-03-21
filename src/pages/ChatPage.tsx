import { useState, useEffect } from "react";
import { Loader2, Send, Bot, User, Car, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const fetchLeads = () => {
    fetch("http://localhost:5001/api/leads")
      .then(res => res.json())
      .then(data => { setLeads(data); setLoadingLeads(false); })
      .catch(err => { console.error(err); setLoadingLeads(false); });
  };

  const fetchMessages = (leadId: number) => {
    setLoadingMessages(true);
    fetch(`http://localhost:5001/api/messages/lead/${leadId}`)
      .then(res => res.json())
      .then(data => { setMessages(data); setLoadingMessages(false); })
      .catch(err => { console.error(err); setLoadingMessages(false); });
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleSelectLead = (lead: any) => {
    setSelectedLead(lead);
    fetchMessages(lead.id);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedLead) return;
    const optimisticMessage = {
      id: Date.now(),
      sender: 'sales',
      content: newMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    fetch("http://localhost:5001/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: selectedLead.id, sender: 'sales', content: newMessage })
    }).catch(console.error);

    setNewMessage("");
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Sidebar: Leads List */}
      <div className="w-[280px] shrink-0 flex flex-col border border-border rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Conversations</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Select a lead to view messages</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-minimal">
          {loadingLeads ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No leads available</div>
          ) : (
             leads.map(lead => (
               <div 
                 key={lead.id} 
                 onClick={() => handleSelectLead(lead)}
                 className={`px-4 py-3 border-b border-border/50 cursor-pointer transition-all duration-150 ${
                   selectedLead?.id === lead.id 
                     ? 'bg-primary text-white' 
                     : 'hover:bg-primary/[0.03]'
                 }`}
               >
                 <div className="flex justify-between items-start">
                   <span className={`font-medium text-sm ${selectedLead?.id === lead.id ? '' : 'text-foreground'}`}>
                     {lead.name || lead.phone}
                   </span>
                   <span className={`text-[10px] ${selectedLead?.id === lead.id ? 'text-white/60' : 'text-muted-foreground'}`}>
                     {new Date(lead.created_at).toLocaleDateString()}
                   </span>
                 </div>
                 <div className={`text-xs truncate mt-1 flex items-center gap-1.5 ${
                   selectedLead?.id === lead.id ? 'text-white/70' : 'text-muted-foreground'
                 }`}>
                   <Car className="h-3 w-3 shrink-0" /> {lead.interested_car || "Any"}
                 </div>
               </div>
             ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col border border-border rounded-lg bg-white overflow-hidden">
        {selectedLead ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-white">
              <div>
                <h3 className="font-semibold text-sm text-foreground">{selectedLead.name}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">{selectedLead.phone}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium px-2.5 py-1 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                WhatsApp
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-background/30 scrollbar-minimal">
              {loadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                  <Bot className="h-8 w-8 opacity-20" />
                  <p className="text-xs">No messages yet. Send a message to start.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'sales' || msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.sender === 'sales' 
                        ? 'bg-primary text-white rounded-br-md' 
                        : msg.sender === 'bot' 
                          ? 'bg-primary/80 text-white rounded-br-md' 
                          : 'bg-white border border-border text-foreground rounded-bl-md shadow-sm'
                    }`}>
                      {msg.sender === 'bot' && (
                        <div className="text-[9px] uppercase tracking-wider text-white/50 font-semibold mb-1 flex items-center gap-1">
                          <Bot className="h-2.5 w-2.5"/> Auto-Reply
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <span className={`text-[10px] mt-1 block ${
                        msg.sender === 'sales' || msg.sender === 'bot' 
                          ? 'text-white/50 text-right' 
                          : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-white flex items-center gap-3">
              <Input 
                placeholder={`Message ${selectedLead.name}...`} 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 h-10 text-sm bg-background border-border rounded-full px-4"
              />
              <Button 
                onClick={handleSendMessage} 
                className="h-10 w-10 p-0 shrink-0 bg-primary text-white hover:bg-primary/90 rounded-full shadow-sm shadow-primary/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
            <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-primary/30" />
            </div>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
