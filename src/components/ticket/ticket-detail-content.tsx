"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Paperclip,
  User as UserIcon,
  Check,
  ChevronDown,
  Flag,
  Tags,
  Link2,
  Play,
  Search,
  Bell,
  SlidersHorizontal,
  X,
  FileText,
  Image as ImageIcon,
  Send,
  MessageSquare,
  Activity as ActivityIcon,
  Plus,
  ArrowLeft,
  Trash2,
  PanelLeftOpen,
  Copy,
  Star,
  Pencil,
  Tag,
  Eye,
  Compass,
  MoreHorizontal,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  updateTicket,
  createComment,
  createAttachment,
  deleteAttachment,
  addTicketRelation,
  removeTicketRelation,
} from "@/actions/ticket.actions";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  };
}

interface Status {
  id: string;
  name: string;
  color: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: Date;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface Activity {
  id: string;
  type: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: {
    name: string | null;
  };
}

interface Ticket {
  id: string;
  ticketId: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: Date | null;
  statusId: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: Status;
  assignee: { id: string; name: string | null; image: string | null } | null;
  createdBy: { id: string; name: string | null; image: string | null } | null;
  comments: Comment[];
  attachments: Attachment[];
  activities: Activity[];
  labels: string[];
  project?: {
    id: string;
    name: string;
    ticketPrefix: string;
  };
  sourceRelations?: {
    id: string;
    type: string;
    targetTicket: {
      id: string;
      ticketId: string;
      title: string;
      status: { id: string; name: string; color: string };
    };
  }[];
  targetRelations?: {
    id: string;
    type: string;
    sourceTicket: {
      id: string;
      ticketId: string;
      title: string;
      status: { id: string; name: string; color: string };
    };
  }[];
}

interface TicketDetailContentProps {
  initialTicket: Ticket;
  projectStatuses: Status[];
  workspaceMembers: Member[];
  currentUserId: string;
  currentUserImage: string | null;
  currentUserName: string | null;
  workspaceId: string;
  spaceId: string;
  projectId: string;
  projectTickets?: { id: string; ticketId: string; title: string }[];
  currentUserRole: string;
}

export function TicketDetailContent({
  initialTicket,
  projectStatuses,
  workspaceMembers,
  currentUserId,
  currentUserImage,
  currentUserName,
  workspaceId,
  spaceId,
  projectId,
  projectTickets,
  currentUserRole,
}: TicketDetailContentProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket>(initialTicket);

  const isViewer = currentUserRole === "viewer";
  const isAdminOrOwner = ["owner", "admin"].includes(currentUserRole);

  // States for ticket relationships
  const [relationType, setRelationType] = useState("relates_to");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRelationOpen, setIsRelationOpen] = useState(false);

  const handleAddRelation = async (targetId: string) => {
    if (isViewer) return;
    try {
      const res = await addTicketRelation({
        sourceTicketId: ticket.id,
        targetTicketId: targetId,
        type: relationType
      });
      
      // Update local ticket state optimistically
      setTicket(prev => {
        const newSourceRelations = [...(prev.sourceRelations || [])];
        const targetObj = (projectTickets || []).find(t => t.id === targetId);
        newSourceRelations.push({
          id: res.id,
          type: relationType,
          targetTicket: {
            id: targetId,
            ticketId: targetObj?.ticketId || "TICKET",
            title: targetObj?.title || "",
            status: { id: "", name: "Todo", color: "#6b7280" }
          }
        });
        return {
          ...prev,
          sourceRelations: newSourceRelations
        };
      });
      
      toast.success("Ticket relation added");
      setIsRelationOpen(false);
      setSearchQuery("");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to add relation");
    }
  };

  const handleRemoveRelation = async (relationId: string, isSource: boolean) => {
    if (isViewer) return;
    try {
      await removeTicketRelation(relationId);
      
      setTicket(prev => {
        if (isSource) {
          return {
            ...prev,
            sourceRelations: (prev.sourceRelations || []).filter(r => r.id !== relationId)
          };
        } else {
          return {
            ...prev,
            targetRelations: (prev.targetRelations || []).filter(r => r.id !== relationId)
          };
        }
      });
      
      toast.success("Ticket relation removed");
      router.refresh();
    } catch (error: any) {
      toast.error("Failed to remove relation");
    }
  };

  // Helper to group source relations by type
  const groupedSourceRelations = (ticket.sourceRelations || []).reduce((acc, rel) => {
    if (!acc[rel.type]) acc[rel.type] = [];
    acc[rel.type].push(rel);
    return acc;
  }, {} as Record<string, NonNullable<Ticket["sourceRelations"]>>);

  // Helper to group target relations by type
  const groupedTargetRelations = (ticket.targetRelations || []).reduce((acc, rel) => {
    if (!acc[rel.type]) acc[rel.type] = [];
    acc[rel.type].push(rel);
    return acc;
  }, {} as Record<string, NonNullable<Ticket["targetRelations"]>>);
  
  // Local states for new properties shown in the image
  const [type, setType] = useState<string>("Bug");
  const [subsystem, setSubsystem] = useState<string>("No Subsystem");
  const [affectedVersions, setAffectedVersions] = useState<string>("Unknown");
  const [fixVersions, setFixVersions] = useState<string>("Unscheduled");
  const [nextRelease, setNextRelease] = useState<string>("No");
  const [fixedInBuild, setFixedInBuild] = useState<string>("Next Build");

  // States for inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(ticket.title);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(ticket.description || "");

  // Sidebar / Comments States
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"activity" | "comments">("activity");

  // File Upload Status
  const [isUploading, setIsUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isActuallyDeleting, setIsActuallyDeleting] = useState<string | null>(null);

  // Status updates handler
  const handleUpdateField = async (fields: {
    title?: string;
    description?: string | null;
    priority?: string;
    assigneeId?: string | null;
    statusId?: string;
    dueDate?: Date | null;
  }) => {
    if (isViewer) return;
    try {
      // Optimistic state update
      setTicket((prev) => {
        const next = { ...prev, ...fields };
        if (fields.statusId) {
          const newStatus = projectStatuses.find(s => s.id === fields.statusId);
          if (newStatus) next.status = newStatus;
        }
        if (fields.assigneeId !== undefined) {
          if (fields.assigneeId === null) {
            next.assignee = null;
          } else {
            const member = workspaceMembers.find(m => m.user.id === fields.assigneeId);
            if (member) {
              next.assignee = {
                id: member.user.id,
                name: member.user.name,
                image: member.user.image
              };
            }
          }
        }
        return next;
      });

      await updateTicket(ticket.id, fields);
      router.refresh();
    } catch (error) {
      console.error("Failed to update ticket:", error);
    }
  };

  // Title edit submission
  const handleSubmitTitle = () => {
    if (isViewer) {
      setIsEditingTitle(false);
      return;
    }
    if (titleValue.trim() && titleValue !== ticket.title) {
      handleUpdateField({ title: titleValue });
    }
    setIsEditingTitle(false);
  };

  // Description edit submission
  const handleSubmitDesc = () => {
    if (isViewer) {
      setIsEditingDesc(false);
      return;
    }
    if (descValue !== ticket.description) {
      handleUpdateField({ description: descValue || null });
    }
    setIsEditingDesc(false);
  };

  // Comment submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    if (!commentContent.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const newComment = await createComment(ticket.id, commentContent);
      
      setTicket(prev => ({
        ...prev,
        comments: [...prev.comments, {
          id: newComment.id,
          content: newComment.content,
          createdAt: new Date(newComment.createdAt),
          user: {
            id: currentUserId,
            name: currentUserName,
            image: currentUserImage
          }
        }]
      }));
      setCommentContent("");
      router.refresh();
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Mock File Upload (creates a postgres Attachment record)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewer) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const mockUrl = `/uploads/${Date.now()}-${file.name}`;
      
      const newAttachment = await createAttachment(ticket.id, {
        name: file.name,
        url: mockUrl,
        size: file.size,
        type: file.type,
        base64Data,
      });

      setTicket(prev => ({
        ...prev,
        attachments: [
          {
            id: newAttachment.id,
            name: newAttachment.name,
            url: newAttachment.url,
            size: newAttachment.size,
            type: newAttachment.type,
            createdAt: new Date(newAttachment.createdAt)
          },
          ...prev.attachments
        ]
      }));

      router.refresh();
    } catch (error) {
      console.error("Failed to attach file:", error);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Tags (labels) update handlers
  const handleAddLabel = async (label: string) => {
    if (isViewer) return;
    if (ticket.labels?.includes(label)) return;
    const nextLabels = [...(ticket.labels || []), label];
    try {
      setTicket((prev) => ({ ...prev, labels: nextLabels }));
      await updateTicket(ticket.id, { labels: nextLabels });
      router.refresh();
    } catch (error) {
      console.error("Failed to add label:", error);
    }
  };

  const handleRemoveLabel = async (label: string) => {
    if (isViewer) return;
    const nextLabels = (ticket.labels || []).filter(l => l !== label);
    try {
      setTicket((prev) => ({ ...prev, labels: nextLabels }));
      await updateTicket(ticket.id, { labels: nextLabels });
      router.refresh();
    } catch (error) {
      console.error("Failed to remove label:", error);
    }
  };

  // Priority color map
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (isViewer) return;
    try {
      setIsActuallyDeleting(attachmentId);
      await deleteAttachment(attachmentId);
      setTicket(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.id !== attachmentId)
      }));
      setConfirmDeleteId(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    } finally {
      setIsActuallyDeleting(null);
    }
  };

  // Priority color map
  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case "urgent": return "text-red-500 fill-red-500/20";
      case "high": return "text-yellow-500 fill-yellow-500/20";
      case "medium": return "text-blue-500 fill-blue-500/20";
      case "low": return "text-gray-500 fill-gray-500/20";
      default: return "text-gray-400";
    }
  };

  // Formatter for file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const getRelativeTime = (date: Date | string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (e) {
      return "some time ago";
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* ── Left/Main Panel (Task Details) ──────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto border-r border-border min-w-0 p-8 space-y-6">
        
        {/* Header Breadcrumbs Bar */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            {/* Sidebar toggle and back icons */}
            <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0 bg-transparent">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <Link
              href={`/workspace/${workspaceId}/${spaceId}/${projectId}`}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            
            <span className="text-muted-foreground/40 mx-0.5">/</span>
            
            {/* Breadcrumb links */}
            <Link
              href={`/workspace/${workspaceId}`}
              className="hover:text-foreground hover:underline transition-colors cursor-pointer"
            >
              Workspace
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link
              href={`/workspace/${workspaceId}/${spaceId}/${projectId}`}
              className="hover:text-foreground hover:underline transition-colors cursor-pointer font-medium"
            >
              {ticket.project?.name || "universal dashboard"}
            </Link>
            <span className="text-muted-foreground/40">/</span>
            
            <div className="flex items-center gap-1">
              <Link
                href={`/workspace/${workspaceId}/${spaceId}/${projectId}/ticket/${ticket.ticketId}`}
                className="text-foreground font-semibold hover:underline"
              >
                {ticket.ticketId}
              </Link>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(ticket.ticketId);
                  toast.success(`Copied to clipboard: ${ticket.ticketId}`);
                }}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-0 bg-transparent"
                title="Copy ticket ID"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="relative max-w-xs w-48 md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Enter search request"
              className="w-full bg-card/25 border border-border/80 rounded-lg pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Creation and Update Info Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground/80 border-b border-border/20 pb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Created by <span className="font-semibold text-foreground">{ticket.createdBy?.name || "Kari Ann Imamura"}</span> {getRelativeTime(ticket.createdAt)}
            </span>
            <div className="h-3 w-px bg-border/40 hidden sm:block" />
            <span>
              Updated by <span className="font-semibold text-foreground">{ticket.assignee?.name || ticket.createdBy?.name || "Fajrudin Mudzakkir"}</span> {getRelativeTime(ticket.updatedAt)}
            </span>
          </div>
          
          {/* Visibility control */}
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <Eye className="h-3.5 w-3.5" />
            <span className="font-medium">Visible to issue readers</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>

        {/* Title and Toolbar Row */}
        <div className="flex items-start justify-between gap-4 mt-6 mb-4">
          <div className="flex-1 flex items-center">
            
            {/* Title display/input */}
            <div className="flex-1">
              {isEditingTitle && !isViewer ? (
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleSubmitTitle}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitTitle()}
                  autoFocus
                  className="text-2xl font-bold tracking-tight bg-transparent border-b border-primary/50 outline-none w-full py-0.5 focus:border-primary text-foreground"
                />
              ) : (
                <h1 
                  onClick={() => !isViewer && setIsEditingTitle(true)}
                  className={cn(
                    "text-2xl font-bold tracking-tight text-foreground px-2 py-0.5 -mx-2 rounded-lg leading-snug",
                    !isViewer && "hover:bg-muted/30 cursor-pointer transition-colors"
                  )}
                >
                  {ticket.title}
                </h1>
              )}
            </div>
          </div>
          
          {/* Action Toolbar */}
          <div className="flex items-center gap-2 text-muted-foreground/75 shrink-0 pt-1">
            {!isViewer && (
              <>
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0 bg-transparent"
                  title="Edit Title"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0 bg-transparent" title="Manage Tags">
                  <Tag className="h-4 w-4" />
                </button>
                <button className="p-1.5 rounded hover:bg-muted text-purple-400 hover:text-purple-300 transition-all cursor-pointer border-0 bg-transparent" title="Integrations">
                  <Compass className="h-4 w-4" />
                </button>
              </>
            )}
            {!isViewer && (
              <Popover open={isRelationOpen} onOpenChange={setIsRelationOpen}>
                <PopoverTrigger 
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0 bg-transparent flex items-center justify-center" 
                  title="Relate to"
                >
                  <Link2 className="h-4 w-4" />
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-popover border border-border rounded-xl shadow-xl z-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-xs font-bold text-foreground">Relate Ticket</span>
                      <button 
                        onClick={() => setIsRelationOpen(false)} 
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded border-0 bg-transparent cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    
                    {/* Select Relation Type */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Relation Type</label>
                      <select
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="relates_to">Relates to</option>
                        <option value="is_required_for">Is Required For</option>
                        <option value="depends_on">Depends on</option>
                        <option value="is_duplicated_by">Is Duplicated By</option>
                        <option value="duplicates">Duplicates</option>
                        <option value="parent_for">Parent For</option>
                        <option value="subtask_of">Subtask Of</option>
                        <option value="clones">Clones</option>
                        <option value="is_cloned_by">Is Cloned By</option>
                      </select>
                    </div>

                    {/* Search and Select Target Ticket */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Ticket</label>
                      <input
                        type="text"
                        placeholder="Search tickets by ID or Title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* Scrollable list of options */}
                    <div className="max-h-40 overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/40 bg-background/50">
                      {(() => {
                        const list = (projectTickets || [])
                          .filter(t => t.id !== ticket.id)
                          .filter(t => {
                            const isAlreadySource = (ticket.sourceRelations || []).some(r => r.targetTicket.id === t.id);
                            const isAlreadyTarget = (ticket.targetRelations || []).some(r => r.sourceTicket.id === t.id);
                            return !isAlreadySource && !isAlreadyTarget;
                          })
                          .filter(t => 
                            t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.title.toLowerCase().includes(searchQuery.toLowerCase())
                          );

                        if (list.length === 0) {
                          return (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              No tickets available
                            </div>
                          );
                        }

                        return list.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleAddRelation(t.id)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground flex flex-col gap-0.5 transition-colors border-0 bg-transparent cursor-pointer"
                          >
                            <span className="font-bold text-primary">{t.ticketId}</span>
                            <span className="text-muted-foreground truncate max-w-full">{t.title}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border-0 bg-transparent" title="More Actions">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Task Description */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-lg font-semibold text-foreground">Description</h3>
            {!isViewer && !isEditingDesc && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingDesc(true)}>
                Edit Description
              </Button>
            )}
          </div>
          {isEditingDesc && !isViewer ? (
            <div className="space-y-3">
              <textarea
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                rows={5}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                placeholder="Write detailed task descriptions..."
              />
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsEditingDesc(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmitDesc}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => !isViewer && setIsEditingDesc(true)}
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed",
                !isViewer && "cursor-pointer hover:bg-muted/10 p-2 -m-2 rounded"
              )}
            >
              {ticket.description || (isViewer ? "No description provided." : "No description provided. Click here to add descriptions.")}
            </div>
          )}
        </div>

        {/* Linked Issues Indicator Section */}
        {((ticket.sourceRelations && ticket.sourceRelations.length > 0) || 
          (ticket.targetRelations && ticket.targetRelations.length > 0)) && (
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Linked Issues</h3>
            </div>
            <div className="divide-y divide-border/40">
              {Object.entries(groupedSourceRelations).map(([type, rels]) => (
                <div key={type} className="py-3 first:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                    <span className="text-xs font-bold text-muted-foreground/80 capitalize pt-1.5">
                      {type.replace("_", " ")}
                    </span>
                    <div className="md:col-span-3 space-y-2">
                      {rels.map((rel) => (
                        <div key={rel.id} className="flex items-center justify-between bg-background/40 hover:bg-background/80 border border-border/60 rounded-xl px-4 py-2 text-xs group transition-all">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link 
                              href={`/workspace/${workspaceId}/${spaceId}/${projectId}/ticket/${rel.targetTicket.ticketId}`}
                              className="font-bold text-primary hover:underline shrink-0"
                            >
                              {rel.targetTicket.ticketId}
                            </Link>
                            <span className="text-muted-foreground truncate">{rel.targetTicket.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge 
                              variant="outline" 
                              className="text-[10px] font-semibold"
                              style={{ 
                                borderColor: rel.targetTicket.status?.color || undefined, 
                                color: rel.targetTicket.status?.color || undefined,
                                backgroundColor: rel.targetTicket.status?.color ? `${rel.targetTicket.status.color}15` : undefined
                              }}
                            >
                              {rel.targetTicket.status?.name || "Todo"}
                            </Badge>
                            {!isViewer && (
                              <button
                                onClick={() => handleRemoveRelation(rel.id, true)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all border-0 bg-transparent cursor-pointer"
                                title="Remove link"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {Object.entries(groupedTargetRelations).map(([type, rels]) => (
                <div key={type} className="py-3 last:pb-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                    <span className="text-xs font-bold text-muted-foreground/80 capitalize pt-1.5">
                      {(() => {
                        if (type === "relates_to") return "relates to";
                        if (type === "is_required_for") return "depends on";
                        if (type === "depends_on") return "required for";
                        if (type === "is_duplicated_by") return "duplicates";
                        if (type === "duplicates") return "is duplicated by";
                        if (type === "parent_for") return "subtask of";
                        if (type === "subtask_of") return "parent for";
                        if (type === "clones") return "is cloned by";
                        if (type === "is_cloned_by") return "clones";
                        // legacy fallbacks
                        if (type === "duplicate") return "is duplicated by";
                        if (type === "parent") return "subtask of";
                        return `linked by (${type.replace(/_/g, " ")})`;
                      })()}
                    </span>
                    <div className="md:col-span-3 space-y-2">
                      {rels.map((rel) => (
                        <div key={rel.id} className="flex items-center justify-between bg-background/40 hover:bg-background/80 border border-border/60 rounded-xl px-4 py-2 text-xs group transition-all">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link 
                              href={`/workspace/${workspaceId}/${spaceId}/${projectId}/ticket/${rel.sourceTicket.ticketId}`}
                              className="font-bold text-primary hover:underline shrink-0"
                            >
                              {rel.sourceTicket.ticketId}
                            </Link>
                            <span className="text-muted-foreground truncate">{rel.sourceTicket.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge 
                              variant="outline" 
                              className="text-[10px] font-semibold"
                              style={{ 
                                borderColor: rel.sourceTicket.status?.color || undefined, 
                                color: rel.sourceTicket.status?.color || undefined,
                                backgroundColor: rel.sourceTicket.status?.color ? `${rel.sourceTicket.status.color}15` : undefined
                              }}
                            >
                              {rel.sourceTicket.status?.name || "Todo"}
                            </Badge>
                            {!isViewer && (
                              <button
                                onClick={() => handleRemoveRelation(rel.id, false)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all border-0 bg-transparent cursor-pointer"
                                title="Remove link"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Attachments Section */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Attachments</h3>
            </div>
            {!isViewer && (
              <label className="bg-primary hover:bg-primary/95 text-primary-foreground h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.02]">
                <Plus className="h-3.5 w-3.5" />
                <span>Add File</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>

          {/* Render Attachment Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ticket.attachments?.map((file) => {
              const isImage = file.type.startsWith("image/");
              
              return (
                <div key={file.id} className="group relative border border-border/70 hover:border-primary/30 rounded-xl overflow-hidden bg-background/50 flex flex-col hover:shadow-md transition-all duration-200">
                  {isImage ? (
                    <div className="aspect-video w-full bg-accent/40 relative flex items-center justify-center overflow-hidden border-b border-border/40">
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        crossOrigin="anonymous"
                      />
                      <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-accent/30 flex items-center justify-center border-b border-border/40">
                      <FileText className="h-8 w-8 text-muted-foreground/45" />
                    </div>
                  )}

                  <div className="p-2 flex items-center justify-between gap-1.5 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold truncate text-foreground leading-tight" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-0.5 shrink-0">
                      <a href={file.url} 
                         download={file.name}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-colors"
                         title="Download file"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {!isViewer && (
                        <button
                          onClick={() => setConfirmDeleteId(file.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/30 transition-colors"
                          title="Hapus attachment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {confirmDeleteId === file.id && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/95 backdrop-blur-sm border border-destructive/30 animate-in fade-in duration-150">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </div>
                      <p className="text-xs font-semibold text-foreground text-center px-4">
                        Hapus attachment ini?
                      </p>
                      <p className="text-[10px] text-muted-foreground text-center px-6 -mt-1 truncate max-w-full">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isActuallyDeleting === file.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(file.id)}
                          disabled={isActuallyDeleting === file.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isActuallyDeleting === file.id ? (
                            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {ticket.attachments?.length === 0 && (
              <div className="sm:col-span-2 border border-dashed border-border/60 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-2">
                <Paperclip className="h-8 w-8 text-muted-foreground/45" />
                <p className="text-xs text-muted-foreground">No attachments yet. Drop images, PDFs or other files to upload.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Activity & Comments (Now at the bottom, below Attachments) ── */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header Tabs */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveRightTab("activity")}
                className={`text-base font-bold pb-2 transition-colors border-b-2 px-1 -mb-[13px] ${
                  activeRightTab === "activity"
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveRightTab("comments")}
                className={`text-base font-bold pb-2 transition-colors border-b-2 px-1 -mb-[13px] relative ${
                  activeRightTab === "comments"
                    ? "text-foreground border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                Comments
                {ticket.comments.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {ticket.comments.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <button className="hover:text-foreground transition-colors"><Search className="h-4 w-4" /></button>
              <button className="hover:text-foreground transition-colors"><Bell className="h-4 w-4" /></button>
              <button className="hover:text-foreground transition-colors"><SlidersHorizontal className="h-4 w-4" /></button>
            </div>
          </div>

          {/* List Content */}
          <div className="pt-2">
            {activeRightTab === "activity" ? (
              <div className="max-h-80 overflow-y-auto pr-2 -mr-2 scrollbar-thin">
                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-3 before:h-full before:w-px before:bg-border/60 pb-2">
                  {/* Activity Log */}
                  {ticket.activities.map((act) => (
                    <div key={act.id} className="relative flex gap-4 text-xs animate-in fade-in duration-200">
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent border border-border shadow-sm">
                        <ActivityIcon className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{act.user.name || "System"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(act.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {act.type === "ticket_created" && "created this ticket."}
                          {act.type === "status_change" && `moved the task to a new status.`}
                          {act.type === "priority_change" && `updated the priority to ${act.newValue}.`}
                          {act.type === "comment_added" && `added a new comment.`}
                          {act.type === "title_change" && `changed the title.`}
                          {act.type === "description_change" && `updated the description.`}
                          {act.type === "assignee_change" && `reassigned the ticket.`}
                          {act.type === "due_date_change" && `changed the due date.`}
                          {act.type === "labels_change" && `updated the labels.`}
                          {act.type === "attachment_added" && `added an attachment: ${act.newValue}.`}
                          {act.type === "attachment_removed" && `removed an attachment.`}
                          {act.type === "relation_added" && `added a ticket relation: ${act.newValue}.`}
                          {act.type === "relation_removed" && `removed a ticket relation.`}
                        </p>
                      </div>
                    </div>
                  ))}

                  {ticket.activities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center space-y-2">
                      <ActivityIcon className="h-8 w-8 text-muted-foreground/35" />
                      <p className="text-xs">No activity logged yet.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-2 -mr-2 scrollbar-thin">
                <div className="space-y-6 pb-2">
                  {/* Comments List */}
                  {ticket.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-xs animate-in fade-in duration-200">
                      <Avatar className="h-7 w-7 border border-border">
                        <AvatarImage src={comment.user.image || ""} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {comment.user.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground truncate">{comment.user.name}</span>
                          <span className="text-[9px] text-muted-foreground/80">
                            {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-foreground/90 bg-accent/40 border border-border/40 p-3 rounded-2xl leading-relaxed whitespace-pre-wrap break-words">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))}

                  {ticket.comments.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center space-y-2">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/35" />
                      <p className="text-xs">No comments yet. Write one below to get the conversation started.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Comment Box Input Toolbar (ClickUp High Fidelity) */}
          {!isViewer && (
            <div className="pt-4 border-t border-border/50">
              <form onSubmit={handleAddComment} className="flex flex-col border border-border/80 rounded-2xl bg-card/25 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 overflow-hidden shadow-sm transition-all">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full bg-transparent resize-none border-0 outline-none px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(e);
                    }
                  }}
                />

                <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 bg-accent/15">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    
                    {/* File Attachment Trigger inside comment toolbar */}
                    <label className="hover:text-foreground cursor-pointer transition-colors p-1 rounded hover:bg-muted">
                      <Paperclip className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                    </label>
                    
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">AI</span>
                    <span className="text-xs font-semibold">@</span>
                  </div>

                  <button
                    type="submit"
                    disabled={!commentContent.trim() || isSubmittingComment}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:hover:bg-primary h-7 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    {isSubmittingComment ? (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <span>Comment</span>
                        <Send className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>

      {/* ── Right Panel (Task Properties Sidebar) ──────────────── */}
      <div className="w-full max-w-xs md:max-w-sm flex flex-col overflow-y-auto bg-card/10 backdrop-blur-md p-6 space-y-6 border-l border-border">
        <div className="flex flex-col space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-3">
            Task Properties
          </h3>

          <div className="space-y-3.5">
            
            {/* Attribute: Project */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              <div className="flex flex-col space-y-0.5 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Project</span>
                <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer truncate">
                  {ticket.project?.name || "universal dashboard"}
                </span>
              </div>
              <div className="h-6 w-6 rounded bg-pink-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 uppercase">
                {(ticket.project?.name || "universal dashboard")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            </div>

            {/* Attribute: Priority */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Priority</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {ticket.priority.toLowerCase() === "low" && "4 LEVEL 4 - All Other Cases"}
                      {ticket.priority.toLowerCase() === "medium" && "3 LEVEL 3 - Minor"}
                      {ticket.priority.toLowerCase() === "high" && "2 LEVEL 2 - Major"}
                      {ticket.priority.toLowerCase() === "urgent" && "1 LEVEL 1 - Blockers"}
                    </span>
                  </div>
                  
                  {/* Square Box for Priority Number */}
                  <div className={`h-6 w-6 rounded text-white font-bold flex items-center justify-center text-[11px] shadow-sm shrink-0 uppercase ml-2
                    ${ticket.priority.toLowerCase() === "low" && "bg-yellow-500"}
                    ${ticket.priority.toLowerCase() === "medium" && "bg-blue-500"}
                    ${ticket.priority.toLowerCase() === "high" && "bg-orange-500"}
                    ${ticket.priority.toLowerCase() === "urgent" && "bg-red-500"}
                  `}>
                    {ticket.priority.toLowerCase() === "low" && "4"}
                    {ticket.priority.toLowerCase() === "medium" && "3"}
                    {ticket.priority.toLowerCase() === "high" && "2"}
                    {ticket.priority.toLowerCase() === "urgent" && "1"}
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Priority</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {ticket.priority.toLowerCase() === "low" && "4 LEVEL 4 - All Other Cases"}
                        {ticket.priority.toLowerCase() === "medium" && "3 LEVEL 3 - Minor"}
                        {ticket.priority.toLowerCase() === "high" && "2 LEVEL 2 - Major"}
                        {ticket.priority.toLowerCase() === "urgent" && "1 LEVEL 1 - Blockers"}
                      </span>
                    </div>
                    
                    {/* Square Box for Priority Number */}
                    <div className={`h-6 w-6 rounded text-white font-bold flex items-center justify-center text-[11px] shadow-sm shrink-0 uppercase ml-2
                      ${ticket.priority.toLowerCase() === "low" && "bg-yellow-500"}
                      ${ticket.priority.toLowerCase() === "medium" && "bg-blue-500"}
                      ${ticket.priority.toLowerCase() === "high" && "bg-orange-500"}
                      ${ticket.priority.toLowerCase() === "urgent" && "bg-red-500"}
                    `}>
                      {ticket.priority.toLowerCase() === "low" && "4"}
                      {ticket.priority.toLowerCase() === "medium" && "3"}
                      {ticket.priority.toLowerCase() === "high" && "2"}
                      {ticket.priority.toLowerCase() === "urgent" && "1"}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border">
                    {[
                      { val: "urgent", label: "1 LEVEL 1 - Blockers" },
                      { val: "high", label: "2 LEVEL 2 - Major" },
                      { val: "medium", label: "3 LEVEL 3 - Minor" },
                      { val: "low", label: "4 LEVEL 4 - All Other Cases" }
                    ].map((p) => (
                      <DropdownMenuItem 
                        key={p.val}
                        onClick={() => handleUpdateField({ priority: p.val })}
                        className="flex items-center gap-2.5 cursor-pointer text-xs focus:bg-accent focus:text-accent-foreground"
                      >
                        <Flag className={`h-3.5 w-3.5 ${getPriorityColor(p.val)}`} />
                        {p.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: Type */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {type}
                    </span>
                  </div>
                  <div className="h-6 w-6 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                    {type.charAt(0).toUpperCase()}
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {type}
                      </span>
                    </div>
                    <div className="h-6 w-6 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                      {type.charAt(0).toUpperCase()}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border w-40">
                    {["Bug", "Feature", "Task", "Improvement", "Epic"].map((t) => (
                      <DropdownMenuItem 
                        key={t}
                        onClick={() => setType(t)}
                        className="cursor-pointer text-xs focus:bg-accent"
                      >
                        {t}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: State (Status) */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">State</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {ticket.status.name}
                    </span>
                  </div>
                  
                  {/* Square Box for State Initial */}
                  <div className="h-6 w-6 rounded font-bold flex items-center justify-center text-[11px] shadow-sm text-white shrink-0 uppercase ml-2"
                       style={{ backgroundColor: ticket.status.color }}>
                    {ticket.status.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">State</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {ticket.status.name}
                      </span>
                    </div>
                    
                    {/* Square Box for State Initial */}
                    <div className="h-6 w-6 rounded font-bold flex items-center justify-center text-[11px] shadow-sm text-white shrink-0 uppercase ml-2"
                         style={{ backgroundColor: ticket.status.color }}>
                      {ticket.status.name.charAt(0).toUpperCase()}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background border-border">
                    {projectStatuses.map((s) => (
                      <DropdownMenuItem 
                        key={s.id}
                        onClick={() => handleUpdateField({ statusId: s.id })}
                        className="flex items-center justify-between cursor-pointer focus:bg-accent focus:text-accent-foreground"
                      >
                        <span className="font-semibold text-xs" style={{ color: s.color }}>{s.name.toUpperCase()}</span>
                        {ticket.statusId === s.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: Assignee */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assignee</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                    </span>
                  </div>
                  {ticket.assignee ? (
                    <Avatar className="h-6 w-6 shrink-0 shadow-sm ml-2">
                      <AvatarImage src={ticket.assignee.image || ""} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {ticket.assignee.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "A"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0 ml-2">
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assignee</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                      </span>
                    </div>
                    {ticket.assignee ? (
                      <Avatar className="h-6 w-6 shrink-0 shadow-sm ml-2">
                        <AvatarImage src={ticket.assignee.image || ""} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                          {ticket.assignee.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "A"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0 ml-2">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border-border">
                  <DropdownMenuItem 
                    onClick={() => handleUpdateField({ assigneeId: null })}
                    className="text-xs text-muted-foreground cursor-pointer focus:bg-accent"
                  >
                    Unassign Ticket
                  </DropdownMenuItem>
                  <Separator className="my-1" />
                  {workspaceMembers.map((member) => (
                    <DropdownMenuItem 
                      key={member.id}
                      onClick={() => handleUpdateField({ assigneeId: member.user.id })}
                      className="flex items-center gap-2.5 cursor-pointer focus:bg-accent"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.user.image || ""} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {member.user.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">{member.user.name}</span>
                        <span className="text-[9px] text-muted-foreground">{member.user.email}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>

            {/* Attribute: Subsystem */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Subsystem</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {subsystem}
                    </span>
                  </div>
                  <div className="h-6 w-6 rounded bg-purple-600/20 border border-purple-500/30 text-purple-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                    S
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Subsystem</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {subsystem}
                      </span>
                    </div>
                    <div className="h-6 w-6 rounded bg-purple-600/20 border border-purple-500/30 text-purple-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                      S
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border w-44">
                    {["No Subsystem", "Frontend", "Backend", "Database", "DevOps", "Analytics"].map((s) => (
                      <DropdownMenuItem 
                        key={s}
                        onClick={() => setSubsystem(s)}
                        className="cursor-pointer text-xs focus:bg-accent"
                      >
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: Affected Versions */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Affected versions</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {affectedVersions}
                    </span>
                  </div>
                  <div className="h-6 w-6 rounded bg-teal-600/20 border border-teal-500/30 text-teal-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                    A
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Affected versions</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {affectedVersions}
                      </span>
                    </div>
                    <div className="h-6 w-6 rounded bg-teal-600/20 border border-teal-500/30 text-teal-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                      A
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border w-40">
                    {["Unknown", "v1.0.0", "v1.1.0", "v2.0.0", "v2.1.0"].map((v) => (
                      <DropdownMenuItem 
                        key={v}
                        onClick={() => setAffectedVersions(v)}
                        className="cursor-pointer text-xs focus:bg-accent"
                      >
                        {v}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: Fix Versions */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fix versions</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {fixVersions}
                    </span>
                  </div>
                  <div className="h-6 w-6 rounded bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                    F
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fix versions</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {fixVersions}
                      </span>
                    </div>
                    <div className="h-6 w-6 rounded bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                      F
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border w-40">
                    {["Unscheduled", "v1.0.0", "v1.1.0", "v2.0.0", "v2.1.0"].map((v) => (
                      <DropdownMenuItem 
                        key={v}
                        onClick={() => setFixVersions(v)}
                        className="cursor-pointer text-xs focus:bg-accent"
                      >
                        {v}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: Next Release */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Next Release</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {nextRelease}
                    </span>
                  </div>
                  <div className="h-6 w-6 rounded bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                    N
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Next Release</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {nextRelease}
                      </span>
                    </div>
                    <div className="h-6 w-6 rounded bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                      N
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border w-32">
                    {["No", "Yes"].map((o) => (
                      <DropdownMenuItem 
                        key={o}
                        onClick={() => setNextRelease(o)}
                        className="cursor-pointer text-xs focus:bg-accent"
                      >
                        {o}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: Fixed in build */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              {isViewer ? (
                <div className="flex-1 flex items-center justify-between text-left">
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fixed in build</span>
                    <span className="text-sm font-semibold text-muted-foreground truncate">
                      {fixedInBuild}
                    </span>
                  </div>
                  <div className="h-6 w-6 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                    B
                  </div>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex-1 flex items-center justify-between text-left outline-none cursor-pointer">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Fixed in build</span>
                      <span className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                        {fixedInBuild}
                      </span>
                    </div>
                    <div className="h-6 w-6 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                      B
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border-border w-40">
                    {["Next Build", "Build v1.0", "Build v1.1", "None"].map((b) => (
                      <DropdownMenuItem 
                        key={b}
                        onClick={() => setFixedInBuild(b)}
                        className="cursor-pointer text-xs focus:bg-accent"
                      >
                        {b}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Attribute: Due Date */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              <div className="flex flex-col space-y-0.5 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Due Date</span>
                {isViewer ? (
                  <span className="text-xs font-semibold text-muted-foreground mt-1">
                    {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : "No due date"}
                  </span>
                ) : (
                  <input
                    type="date"
                    value={ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => handleUpdateField({ dueDate: e.target.value ? new Date(e.target.value) : null })}
                    className="bg-transparent border border-border/60 hover:border-border rounded-lg text-xs px-2.5 py-1 outline-none text-foreground cursor-pointer focus:border-primary mt-1 w-[130px]"
                  />
                )}
              </div>
              <div className="h-6 w-6 rounded bg-rose-600/20 border border-rose-500/30 text-rose-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                D
              </div>
            </div>

            {/* Attribute: Track Time */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              <div className="flex flex-col space-y-1 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Track Time</span>
                {isViewer ? (
                  <span className="text-xs font-semibold text-muted-foreground italic">0h 0m</span>
                ) : (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
                    <Play className="h-3 w-3" />
                    <span>Add time</span>
                  </button>
                )}
              </div>
              <div className="h-6 w-6 rounded bg-slate-600/20 border border-slate-500/30 text-slate-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                T
              </div>
            </div>

            {/* Attribute: Tags */}
            <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 -mx-2 rounded-xl transition-all">
              <div className="flex flex-col space-y-1 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
                <div className="flex flex-wrap gap-1.5 items-center max-w-[180px]">
                  {ticket.labels && ticket.labels.length > 0 ? (
                    ticket.labels.map((label) => (
                      <Badge 
                        key={label} 
                        variant="secondary" 
                        className={cn(
                          "text-[9px] px-2 py-0.5 font-semibold bg-primary/10 text-primary flex items-center gap-1 group transition-all",
                          !isViewer && "hover:bg-primary/20 cursor-pointer"
                        )}
                        onClick={() => !isViewer && handleRemoveLabel(label)}
                      >
                        {label}
                        {!isViewer && (
                          <X className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic mr-1">Empty</span>
                  )}
                  
                  {!isViewer && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-5 w-5 rounded border border-dashed border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hover:border-border cursor-pointer">
                        <Plus className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-background border-border">
                        <div className="p-2 border-b border-border">
                          <input
                            type="text"
                            placeholder="Add tag..."
                            className="w-full bg-transparent border border-border/85 rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  handleAddLabel(val);
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                        </div>
                        {["bug", "feature", "refactor", "docs", "design", "chore"].filter(t => !ticket.labels?.includes(t)).map((label) => (
                          <DropdownMenuItem 
                            key={label}
                            onClick={() => handleAddLabel(label)}
                            className="text-xs capitalize cursor-pointer focus:bg-accent"
                          >
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <div className="h-6 w-6 rounded bg-amber-600/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0 ml-2">
                G
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Internal ScrollArea helper component to prevent hydration mismatches
function ScrollAreaClient({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-y-auto ${className || ""}`}>
      {children}
    </div>
  );
}
