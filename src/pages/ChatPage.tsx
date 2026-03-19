import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* Sidebar: Leads List */}
      <Card className="w-1/3 flex flex-col border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">WhatsApp Chats</h2>
          <p className="text-xs text-slate-500">Select a lead to view messages</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingLeads ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No leads available</div>
          ) : (
             leads.map(lead => (
               <div 
                 key={lead.id} 
                 onClick={() => handleSelectLead(lead)}
                 className={`p-4 border-b border-slate-50 cursor-pointer transition-colors ${selectedLead?.id === lead.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-slate-50'}`}
               >
                 <div className="flex justify-between items-start">
                   <span className="font-semibold text-slate-900">{lead.name || lead.phone}</span>
                   <span className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleDateString()}</span>
                 </div>
                 <div className="text-sm text-slate-500 truncate mt-1 flex items-center gap-2">
                   <Car className="h-3 w-3" /> {lead.interested_car || "Any"}
                 </div>
               </div>
             ))
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-slate-200 shadow-sm overflow-hidden bg-white">
        {selectedLead ? (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{selectedLead.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedLead.phone}</p>
              </div>
              <div className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">WhatsApp Active</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {loadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <Bot className="h-12 w-12 text-slate-300" />
                  <p className="text-sm">No messages yet. Send a message to start!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'sales' || msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.sender === 'sales' ? 'bg-primary text-white rounded-br-none shadow-sm' : msg.sender === 'bot' ? 'bg-slate-800 text-white rounded-br-none shadow-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                      {msg.sender === 'bot' && <div className="text-[10px] uppercase text-slate-400 font-bold mb-1 flex items-center gap-1"><Bot className="h-3 w-3"/> Auto-Reply</div>}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className={`text-[10px] mt-1 block ${msg.sender === 'sales' || msg.sender === 'bot' ? 'text-primary-foreground/70 text-right' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3">
              <Input 
                placeholder={`Message ${selectedLead.name}...`} 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 border-slate-300 rounded-full bg-slate-50"
              />
              <Button onClick={handleSendMessage} className="rounded-full h-10 w-10 p-0 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <MessageSquare className="h-16 w-16 text-slate-200" />
            <p>Select a conversation from the sidebar to start chatting</p>
          </div>
        )}
      </Card>
    </div>
  );
}


