"use client";

import { useState, useTransition, useRef } from "react";
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Pin, 
  Send, 
  Bold, 
  Italic, 
  Code, 
  List, 
  Trash2, 
  X,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Calendar,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  createDiscussion, 
  deleteDiscussion, 
  togglePinDiscussion, 
  createDiscussionReply, 
  getDiscussionWithReplies
} from "@/actions/discussion.actions";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  createdAt: Date;
  author: Author;
  _count: {
    replies: number;
  };
}

interface Reply {
  id: string;
  content: string;
  createdAt: Date;
  author: Author;
}

interface DiscussionWithReplies extends Discussion {
  replies: Reply[];
}

interface DiscussionBoardViewProps {
  projectId: string;
  initialDiscussions: Discussion[];
  currentUser: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
}

const CATEGORIES = ["All", "Planning", "Brainstorming", "Meeting Notes", "General"];

export function DiscussionBoardView({ 
  projectId, 
  initialDiscussions, 
  currentUser 
}: DiscussionBoardViewProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<DiscussionWithReplies | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Thread Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newContent, setNewContent] = useState("");
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  // Reply Input State
  const [replyContent, setReplyContent] = useState("");

  // Delete confirm state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Load detailed thread with replies
  const handleSelectThread = async (threadId: string) => {
    try {
      const details = await getDiscussionWithReplies(threadId);
      if (details) {
        setSelectedThread(details as any);
      }
    } catch (err) {
      toast.error("Failed to load discussion replies");
    }
  };

  const refreshActiveThread = async () => {
    if (!selectedThread) return;
    const details = await getDiscussionWithReplies(selectedThread.id);
    if (details) {
      setSelectedThread(details as any);
    }
  };

  // Filtered discussions list
  const filteredDiscussions = discussions.filter(d => {
    const matchesCategory = activeCategory === "All" || d.category === activeCategory;
    const matchesSearch = searchQuery.trim() === "" || 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Create Discussion
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Please fill in both the title and content.");
      return;
    }

    startTransition(async () => {
      try {
        const created = await createDiscussion({
          projectId,
          title: newTitle,
          content: newContent,
          category: newCategory,
        });

        toast.success("Discussion published!");
        
        const newObj: Discussion = {
          id: created.id,
          title: newTitle,
          content: newContent,
          category: newCategory,
          isPinned: false,
          createdAt: new Date(),
          author: {
            id: currentUser.id,
            name: currentUser.name || "You",
            image: currentUser.image || null
          },
          _count: { replies: 0 }
        };

        setDiscussions(prev => [newObj, ...prev]);
        setIsCreateOpen(false);
        setNewTitle("");
        setNewContent("");
        
        handleSelectThread(created.id);
      } catch (err) {
        toast.error("Failed to start discussion");
      }
    });
  };

  // Reply Submit
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyContent.trim()) return;

    const currentReplyText = replyContent;
    setReplyContent("");

    try {
      await createDiscussionReply({
        discussionId: selectedThread.id,
        content: currentReplyText,
      });

      toast.success("Comment posted");
      
      const newReplyObj: Reply = {
        id: Math.random().toString(),
        content: currentReplyText,
        createdAt: new Date(),
        author: {
          id: currentUser.id,
          name: currentUser.name || "You",
          image: currentUser.image || null
        }
      };

      setSelectedThread(prev => prev ? {
        ...prev,
        replies: [...prev.replies, newReplyObj]
      } : null);

      setDiscussions(prev => 
        prev.map(d => d.id === selectedThread.id 
          ? { ...d, _count: { replies: d._count.replies + 1 } } 
          : d
        )
      );

      refreshActiveThread();
    } catch (err) {
      toast.error("Failed to post reply");
    }
  };

  // Toggle Pin
  const handleTogglePin = async (threadId: string, currentPin: boolean) => {
    try {
      await togglePinDiscussion(threadId, !currentPin);
      toast.success(currentPin ? "Thread unpinned" : "Thread pinned to top");
      
      setDiscussions(prev => {
        const updated = prev.map(d => d.id === threadId ? { ...d, isPinned: !currentPin } : d);
        return updated.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      if (selectedThread && selectedThread.id === threadId) {
        setSelectedThread(prev => prev ? { ...prev, isPinned: !currentPin } : null);
      }
    } catch (err) {
      toast.error("Failed to update pin status");
    }
  };

  // Delete Discussion Confirm
  const handleDeleteDiscussionConfirm = async () => {
    if (!deleteTargetId) return;

    try {
      await deleteDiscussion(deleteTargetId);
      toast.success("Thread deleted successfully");
      setDiscussions(prev => prev.filter(d => d.id !== deleteTargetId));
      if (selectedThread?.id === deleteTargetId) {
        setSelectedThread(null);
      }
      setDeleteTargetId(null);
    } catch (err) {
      toast.error("Failed to delete discussion");
    }
  };

  // Formatting shortcuts
  const insertFormat = (tag: string) => {
    const textarea = contentInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let replacement = "";
    if (tag === "bold") replacement = `**${selected || "bold text"}**`;
    else if (tag === "italic") replacement = `*${selected || "italic text"}*`;
    else if (tag === "code") replacement = `\`${selected || "code"}\``;
    else if (tag === "list") replacement = `\n- ${selected || "list item"}`;

    setNewContent(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2 + (selected || "text").length);
    }, 50);
  };

  // Render markdown tags beautifully
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      let rendered = line;
      rendered = rendered.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      rendered = rendered.replace(/\*(.*?)\*/g, "<em>$1</em>");
      rendered = rendered.replace(/`(.*?)`/g, "<code class='bg-muted px-1 py-0.5 rounded font-mono text-[9px] border border-border/40 text-rose-500'>$1</code>");
      
      if (line.trim().startsWith("- ")) {
        return (
          <li key={i} className="list-disc ml-5 text-[11px] text-foreground/90 my-0.5 leading-normal" dangerouslySetInnerHTML={{ __html: rendered.trim().substring(2) }} />
        );
      }
      return (
        <p key={i} className="text-[11px] text-foreground/90 leading-normal min-h-[14px] mb-1" dangerouslySetInnerHTML={{ __html: rendered }} />
      );
    });
  };

  // Get color for category badges
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case "Planning":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25";
      case "Brainstorming":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25";
      case "Meeting Notes":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25";
    }
  };

  // Profile Picture Renderer with Initials Fallback
  const renderAvatar = (user: { name: string | null; image: string | null }, sizeClass = "h-8 w-8 text-xs") => {
    if (user.image) {
      return (
        <img 
          src={user.image} 
          alt={user.name || "User avatar"} 
          className={`${sizeClass} rounded-full object-cover shrink-0 border border-border/50 shadow-sm`}
          onError={(e) => {
            // If image path fails, hide and show initials
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      );
    }
    
    const initial = user.name?.charAt(0).toUpperCase() || "U";
    return (
      <div className={`${sizeClass} rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold uppercase shrink-0`}>
        {initial}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full border border-border/45 bg-card rounded-2xl overflow-hidden shadow-md">
      
      {/* ── Left Sidebar: Thread List ────────────────────────────────────────────────────────────── */}
      <div className={`w-full md:w-[350px] shrink-0 border-r border-border/50 flex flex-col min-h-0 bg-muted/5 ${selectedThread ? "hidden md:flex" : "flex"}`}>
        
        {/* Header toolbar */}
        <div className="p-3 border-b border-border/40 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Channels</span>
            </h2>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-7 rounded-lg gap-1 shadow-sm text-xs font-semibold px-2.5">
              <Plus className="h-3 w-3" />
              New Topic
            </Button>
          </div>

          {/* Search container */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground/60" />
            <input 
              type="text" 
              placeholder="Search discussions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/70 rounded-lg pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Categories list */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-background text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Discussions Scroll List */}
        <div className="flex-grow overflow-y-auto divide-y divide-border/30">
          {filteredDiscussions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center py-20 text-muted-foreground">
              <BookOpen className="h-8 w-8 text-muted-foreground/20 mb-2.5" />
              <span className="text-xs font-bold text-foreground">No Discussions</span>
              <span className="text-[9px] mt-0.5 max-w-[200px]">Be the first to start a discussion thread!</span>
            </div>
          ) : (
            filteredDiscussions.map((d) => {
              const isActive = selectedThread?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => handleSelectThread(d.id)}
                  className={`p-3 text-left transition-all hover:bg-muted/10 cursor-pointer relative ${
                    isActive ? "bg-primary/[0.02] border-l-4 border-primary" : "border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0 tracking-wider ${getCategoryStyles(d.category)}`}>
                      {d.category}
                    </span>
                    
                    <div className="flex items-center gap-1 text-muted-foreground text-[9px] shrink-0 font-medium">
                      {d.isPinned && (
                        <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <span className="flex items-center gap-0.5 bg-muted/40 px-1 py-0.2 rounded">
                        <MessageCircle className="h-2 w-2" />
                        {d._count.replies}
                      </span>
                    </div>
                  </div>

                  <h4 className={`text-xs font-bold text-foreground mt-2 line-clamp-1 transition-colors ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}>
                    {d.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 leading-normal">
                    {d.content}
                  </p>

                  <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-border/20 text-[9px] text-muted-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderAvatar(d.author, "h-4.5 w-4.5 text-[8px]")}
                      <span className="font-semibold text-foreground/80 truncate max-w-[110px]">{d.author.name}</span>
                    </div>
                    <span className="shrink-0 flex items-center gap-0.5">
                      <Calendar className="h-2 w-2" />
                      {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Panel: Active Thread Details ─────────────────────────────────────────────────────────── */}
      <div className={`flex-grow flex flex-col bg-background min-w-0 ${!selectedThread ? "hidden md:flex" : "flex"}`}>
        {selectedThread ? (
          <div className="flex-grow flex flex-col min-h-0">
            
            {/* Header toolbar */}
            <div className="px-4 py-2 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/5">
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 md:hidden rounded-lg mr-0.5 shrink-0"
                  onClick={() => setSelectedThread(null)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <div className="flex items-center">
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${getCategoryStyles(selectedThread.category)}`}>
                    {selectedThread.category}
                  </span>
                </div>
              </div>

              {/* Pin / Delete Controls */}
              <div className="flex items-center gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-7 w-7 rounded-lg ${selectedThread.isPinned ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "text-muted-foreground hover:bg-muted"}`}
                  onClick={() => handleTogglePin(selectedThread.id, selectedThread.isPinned)}
                >
                  <Pin className={`h-3 w-3 ${selectedThread.isPinned ? "fill-amber-500" : ""}`} />
                </Button>
                {(currentUser.id === selectedThread.author.id) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-500/10"
                    onClick={() => setDeleteTargetId(selectedThread.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable content body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Original Post Card */}
              <div className="bg-primary/[0.02] border border-primary/10 rounded-2xl p-4 space-y-3 shadow-sm">
                
                {/* Author Info & Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderAvatar(selectedThread.author, "h-8 w-8 text-[11px]")}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-foreground truncate">{selectedThread.author.name}</span>
                        <span className="text-[8px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-widest shrink-0">Host</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                        <Calendar className="h-2.5 w-2.5" />
                        Published {new Date(selectedThread.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  
                  <span className="text-[8px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                    Topic Thread
                  </span>
                </div>

                {/* Title and Description */}
                <div className="space-y-2.5">
                  <h2 className="text-sm font-extrabold text-foreground leading-snug tracking-tight border-b border-border/30 pb-2 flex items-center gap-1.5">
                    <span className="text-primary text-sm font-bold">#</span>
                    {selectedThread.title}
                  </h2>
                  
                  {/* Main Content Details */}
                  <div className="bg-background/60 dark:bg-background/40 border-l-2 border-primary rounded-r-xl rounded-l-sm p-3 shadow-inner">
                    <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                      Topic Details
                    </span>
                    <div className="space-y-1 text-foreground/90 font-medium">
                      {renderMarkdown(selectedThread.content)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Replies/Comments separator line */}
              <div className="border-t border-border/40 pt-3 space-y-3">
                <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <MessageSquare className="h-3 w-3 text-primary shrink-0" />
                  <span>Comments ({selectedThread.replies.length})</span>
                </div>

                {/* Replies container list */}
                {selectedThread.replies.length === 0 ? (
                  <div className="py-5 text-center text-[10px] text-muted-foreground/60 italic bg-muted/5 border border-dashed border-border/30 rounded-xl">
                    No comments yet. Write a response below to start brainstorming!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedThread.replies.map(reply => (
                      <div key={reply.id} className="flex gap-2 items-start bg-muted/5 border border-border/20 rounded-xl p-2.5 hover:bg-muted/10 transition-colors">
                        {renderAvatar(reply.author, "h-6.5 w-6.5 text-[9px]")}
                        <div className="flex-grow space-y-0.5 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11px] font-bold text-foreground truncate">{reply.author.name}</span>
                            <span className="text-[9px] text-muted-foreground shrink-0 font-medium">
                              {new Date(reply.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="text-[11px] text-foreground/80 space-y-1 leading-normal">
                            {renderMarkdown(reply.content)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Write Reply input area */}
            <form onSubmit={handleReplySubmit} className="p-3 border-t border-border/40 bg-background/90 backdrop-blur-sm shrink-0">
              <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden p-1.5 gap-1.5 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                {renderAvatar(currentUser as any, "h-6 w-6 text-[9px]")}
                <input
                  type="text"
                  placeholder={`Write a comment response to @${selectedThread.author.name}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/45 px-2 py-1.5"
                />
                <Button type="submit" size="icon" className="h-7 w-7 shrink-0 rounded-lg">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-muted/[0.01]">
            <div className="relative mb-4">
              <span className="h-14 w-14 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <MessageSquare className="h-6 w-6" />
              </span>
              <Sparkles className="h-4 w-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Select a Discussion Topic</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs leading-normal">
              Click a discussion thread on the left panel to review meeting summaries, brainstorm notes, and collaborate with your teammates.
            </p>
          </div>
        )}
      </div>

      {/* ── START NEW DISCUSSION MODAL DIALOG ────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-xs font-bold text-foreground">Start a New Discussion</h2>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleCreateSubmit} className="flex-grow overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Title */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Discussion Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Design Feedback on New UI Layout" 
                    className="w-full bg-background border border-border/85 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    required
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
                  <select 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-background border border-border/85 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Planning">Planning</option>
                    <option value="Brainstorming">Brainstorming</option>
                    <option value="Meeting Notes">Meeting Notes</option>
                  </select>
                </div>
              </div>

              {/* Text Editor Area */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Content</label>
                
                {/* Editing Toolbar */}
                <div className="flex items-center gap-1 p-1 bg-muted/40 border border-b-0 border-border/85 rounded-t-lg">
                  <button 
                    type="button" 
                    onClick={() => insertFormat("bold")}
                    className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => insertFormat("italic")}
                    className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => insertFormat("code")}
                    className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
                    title="Inline Code"
                  >
                    <Code className="h-3 w-3" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => insertFormat("list")}
                    className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
                    title="Bullet List"
                  >
                    <List className="h-3 w-3" />
                  </button>
                  <span className="text-[9px] text-muted-foreground/60 ml-auto mr-1">Markdown supported</span>
                </div>

                <textarea 
                  ref={contentInputRef}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share details, brainstorming list, meeting summary notes, or future planning tasks here..." 
                  className="w-full bg-background border border-border/85 rounded-b-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary min-h-[140px] leading-relaxed"
                  required
                />
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg text-xs h-8 px-3"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="rounded-lg text-xs h-8 px-4 shadow-sm"
                >
                  {isPending ? "Posting..." : "Publish Post"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION DELETE DIALOG ────────────────────────────────────────────────────── */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-foreground">Delete Discussion?</h3>
                <p className="text-[10px] text-muted-foreground">This action cannot be undone. All comments will be lost.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDeleteTargetId(null)}
                className="rounded-lg text-[10px] h-8 px-3"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteDiscussionConfirm}
                className="rounded-lg text-[10px] h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
