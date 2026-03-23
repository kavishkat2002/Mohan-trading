import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Pin, PinOff, Trash2, Edit3, Plus, Bell, Bold, Italic, Underline,
  Link2, Image, AlignLeft, AlignCenter, AlignRight, Palette, Type,
  ChevronDown, X,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API = "http://localhost:5001/api/notices";

const TEXT_COLORS = [
  { label: "Default", val: "inherit" },
  { label: "Red", val: "#ef4444" },
  { label: "Orange", val: "#f97316" },
  { label: "Amber", val: "#f59e0b" },
  { label: "Green", val: "#22c55e" },
  { label: "Blue", val: "#3b82f6" },
  { label: "Violet", val: "#8b5cf6" },
  { label: "Pink", val: "#ec4899" },
];

const BG_COLORS = [
  { label: "None", val: "transparent" },
  { label: "Yellow", val: "#fef9c3" },
  { label: "Green", val: "#dcfce7" },
  { label: "Blue", val: "#dbeafe" },
  { label: "Pink", val: "#fce7f3" },
  { label: "Grey", val: "#f3f4f6" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, []);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
  }, [onChange]);

  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  };

  const insertImage = () => {
    const url = prompt("Enter image URL:", "https://");
    if (url) exec("insertImage", url);
  };

  return (
    <div className="border-2 border-border rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-muted/40 border-b border-border">
        {/* Text Format */}
        <ToolbarBtn icon={Bold} title="Bold" onClick={() => exec("bold")} />
        <ToolbarBtn icon={Italic} title="Italic" onClick={() => exec("italic")} />
        <ToolbarBtn icon={Underline} title="Underline" onClick={() => exec("underline")} />

        <Divider />

        {/* Alignment */}
        <ToolbarBtn icon={AlignLeft} title="Align Left" onClick={() => exec("justifyLeft")} />
        <ToolbarBtn icon={AlignCenter} title="Align Center" onClick={() => exec("justifyCenter")} />
        <ToolbarBtn icon={AlignRight} title="Align Right" onClick={() => exec("justifyRight")} />

        <Divider />

        {/* Font Size */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-[11px] h-7 px-2 rounded hover:bg-background font-medium border border-border/60">
              <Type className="h-3 w-3" />
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-24">
            {FONT_SIZES.map(s => (
              <DropdownMenuItem key={s} className="text-xs" onClick={() => exec("fontSize", "7")}>
                <span style={{ fontSize: s }}>{s}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text Color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button title="Text Color" className="flex items-center gap-0.5 h-7 px-2 rounded hover:bg-background border border-border/60">
              <span className="text-[11px] font-bold" style={{ color: "#3b82f6" }}>A</span>
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36">
            {TEXT_COLORS.map(c => (
              <DropdownMenuItem key={c.val} onClick={() => exec("foreColor", c.val)} className="gap-2 text-xs">
                <span className="h-3 w-3 rounded-full border border-border/50 inline-block" style={{ background: c.val === "inherit" ? "currentColor" : c.val }} />
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Highlight Color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button title="Highlight" className="flex items-center gap-0.5 h-7 px-2 rounded hover:bg-background border border-border/60">
              <Palette className="h-3 w-3 text-amber-500" />
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36">
            {BG_COLORS.map(c => (
              <DropdownMenuItem key={c.val} onClick={() => exec("hiliteColor", c.val)} className="gap-2 text-xs">
                <span className="h-3 w-3 rounded-sm border border-border inline-block" style={{ background: c.val }} />
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Divider />

        {/* Link & Image */}
        <ToolbarBtn icon={Link2} title="Insert Link" onClick={insertLink} />
        <ToolbarBtn icon={Image} title="Insert Image URL" onClick={insertImage} />
      </div>

      {/* Content Editable */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || "")}
        className="min-h-[200px] p-4 text-sm text-foreground outline-none leading-relaxed"
        style={{ overflowY: "auto" }}
        data-placeholder="Write your notice here... Use the toolbar to format text, add links, images, and more."
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] img {
          max-width: 100%;
          border-radius: 8px;
          margin: 8px 0;
        }
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function ToolbarBtn({ icon: Icon, title, onClick }: { icon: any; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-7 w-7 flex items-center justify-center rounded hover:bg-background border border-transparent hover:border-border/60 transition-colors"
    >
      <Icon className="h-3.5 w-3.5 text-foreground/70" />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

export default function Noticeboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotices = () => {
    fetch(API)
      .then(r => r.json())
      .then(data => { setNotices(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchNotices(); }, []);

  const openAdd = () => {
    setEditingNotice(null);
    setTitle("");
    setContent("");
    setPinned(false);
    setIsOpen(true);
  };

  const openEdit = (n: any) => {
    setEditingNotice(n);
    setTitle(n.title);
    setContent(n.content);
    setPinned(n.pinned);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    try {
      const method = editingNotice ? "PUT" : "POST";
      const url = editingNotice ? `${API}/${editingNotice.id}` : API;
      const body = editingNotice
        ? { title, content, pinned }
        : { title, content, pinned, author_id: user?.id, author_name: user?.email };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: editingNotice ? "Notice Updated" : "Notice Posted", description: "All team members can now see this." });
        setIsOpen(false);
        fetchNotices();
      }
    } catch (err) { console.error(err); }
    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this notice?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    toast({ title: "Deleted", description: "Notice removed successfully." });
    fetchNotices();
  };

  const handleTogglePin = async (n: any) => {
    await fetch(`${API}/${n.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: n.title, content: n.content, pinned: !n.pinned }),
    });
    fetchNotices();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-col">
            <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Noticeboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Company-wide announcements and notices.</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 font-semibold h-10 px-5"
            onClick={openAdd}
          >
            <Plus className="mr-2 h-4 w-4" /> Post Notice
          </Button>
        )}
      </div>

      {/* Notices Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="py-4">
            {/* Icon removed */}
          </div>
          <div>
            <p className="text-base font-medium text-foreground">No notices yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Post a notice to inform your team." : "Check back later for updates."}
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={openAdd} className="mt-2 border-2 font-semibold h-10">
              <Plus className="mr-2 h-4 w-4" /> Post First Notice
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n, i) => (
            <div
              key={n.id}
              className={`relative border-2 rounded-2xl bg-white overflow-hidden transition-all hover:shadow-md group
                ${n.pinned ? "border-amber-300 shadow-amber-100 shadow-md" : "border-border"}`}
            >
              {/* Pinned indicator */}
              {n.pinned && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
              )}

              <div className="p-6 space-y-4">
                {/* Title Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {n.pinned && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-black uppercase tracking-widest shrink-0 px-2 py-0.5 rounded-md">
                        📌 Pinned
                      </Badge>
                    )}
                    <h2 className="text-lg font-bold text-foreground truncate">{n.title}</h2>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleTogglePin(n)}
                        title={n.pinned ? "Unpin" : "Pin"}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                      >
                        {n.pinned ? <PinOff className="h-4 w-4 text-amber-600" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <button
                        onClick={() => openEdit(n)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                      >
                        <Edit3 className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Rich Content */}
                <div
                  className="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: n.content }}
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: "1.7",
                  }}
                />

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary">
                        {(n.author_name || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{n.author_name || "Admin"}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl w-full p-0 gap-0 rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-amber-50">
            <DialogTitle className="font-display text-xl font-bold">
              {editingNotice ? "Edit Notice" : "Post New Notice"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave}>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Notice Title</Label>
                <Input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Office Closed on National Holiday"
                  className="h-11 text-base font-semibold border-2 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Content</Label>
                <RichEditor value={content} onChange={setContent} />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPinned(!pinned)}
                  className={`flex items-center gap-2 h-9 px-4 rounded-lg border-2 text-xs font-bold transition-all ${
                    pinned
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"
                  }`}
                >
                  <Pin className="h-3.5 w-3.5" />
                  {pinned ? "Pinned to Top ✓" : "Pin to Top"}
                </button>
                <p className="text-xs text-muted-foreground">Pinned notices appear at the top of the board.</p>
              </div>
            </div>

            <DialogFooter className="px-6 py-5 border-t bg-muted/20 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="h-10 px-6 border-2">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 px-6 bg-primary text-white font-bold shadow-lg shadow-primary/20"
              >
                {isSaving ? "Posting..." : editingNotice ? "Save Changes" : "Post Notice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style>{`
        .prose img { max-width: 100%; border-radius: 10px; margin: 12px 0; }
        .prose a { color: #3b82f6; text-decoration: underline; }
      `}</style>
    </div>
  );
}
