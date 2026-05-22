"use client";

import { useState } from "react";
import { 
  Activity, 
  Plus, 
  RefreshCw, 
  MessageSquare, 
  UserPlus, 
  Paperclip, 
  FileText, 
  Layers, 
  ArrowRight,
  User,
  Calendar,
  AlertCircle
} from "lucide-react";

interface UnifiedActivity {
  id: string;
  type: string;
  createdAt: Date | string;
  user: {
    name: string;
    image: string | null;
  };
  ticket: {
    id: string;
    ticketId: string;
    title: string;
  } | null;
  oldValue?: string | null;
  newValue?: string | null;
  description?: string;
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
  };
}

interface ActivityStreamProps {
  activities: UnifiedActivity[];
  workspaceId: string;
  spaceId: string;
  projectId: string;
}

export function ActivityStream({ 
  activities,
  workspaceId,
  spaceId,
  projectId
}: ActivityStreamProps) {
  const [filter, setFilter] = useState<"all" | "tickets" | "comments" | "files" | "assignments">("all");
  const [now] = useState(() => Date.now());

  const filteredActivities = activities.filter((act) => {
    if (filter === "all") return true;
    if (filter === "tickets") {
      return ["ticket_created", "status_change", "priority_change", "due_date_change", "title_change"].includes(act.type);
    }
    if (filter === "comments") {
      return act.type === "comment_added";
    }
    if (filter === "files") {
      return ["file_uploaded", "attachment_added"].includes(act.type);
    }
    if (filter === "assignments") {
      return act.type === "assignee_change";
    }
    return true;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "ticket_created":
        return <Plus className="h-4 w-4 text-emerald-500" />;
      case "status_change":
        return <RefreshCw className="h-4 w-4 text-sky-500 animate-spin-hover" />;
      case "comment_added":
        return <MessageSquare className="h-4 w-4 text-emerald-500" />;
      case "assignee_change":
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case "file_uploaded":
      case "attachment_added":
        return <Paperclip className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-indigo-400" />;
    }
  };

  const formatRelativeTime = (date: Date | string) => {
    const diff = now - new Date(date).getTime();
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  };

  const renderDescription = (act: UnifiedActivity) => {
    const userName = <span className="font-extrabold text-foreground">{act.user.name}</span>;
    const ticketRef = act.ticket ? (
      <a 
        href={`/workspace/${workspaceId}/${spaceId}/${projectId}/ticket/${act.ticket.id}`}
        className="font-bold text-primary hover:underline cursor-pointer"
      >
        {act.ticket.ticketId}
      </a>
    ) : null;

    switch (act.type) {
      case "ticket_created":
        return (
          <span>
            {userName} created ticket {ticketRef} <span className="text-muted-foreground">({act.ticket?.title})</span>
          </span>
        );

      case "status_change":
        return (
          <span className="leading-relaxed">
            {userName} moved {ticketRef} from{" "}
            <span className="line-through text-muted-foreground/80 bg-muted/30 px-1.5 py-0.5 rounded text-[11px] font-semibold">{act.oldValue || "None"}</span> to{" "}
            <span className="font-bold text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px]">{act.newValue}</span>
          </span>
        );

      case "comment_added":
        return (
          <span>
            {userName} commented on {ticketRef}: <span className="italic text-foreground">"{act.newValue}"</span>
          </span>
        );

      case "assignee_change":
        return (
          <span>
            {userName} assigned {ticketRef} to <span className="font-bold text-foreground">{act.newValue || "Unassigned"}</span>
          </span>
        );

      case "file_uploaded":
        return (
          <span>
            {userName} uploaded file <span className="font-bold text-foreground bg-muted/40 px-1.5 py-0.5 rounded text-[11px] break-all">{act.description}</span>
          </span>
        );

      case "attachment_added":
        return (
          <span>
            {userName} attached file <span className="font-semibold text-foreground bg-muted/40 px-1.5 py-0.5 rounded text-[11px]">{act.newValue}</span> to {ticketRef}
          </span>
        );

      default:
        return (
          <span>
            {userName} updated ticket {ticketRef}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Category filters */}
      <div className="flex border-b border-border/40 pb-0.5 gap-2 shrink-0 overflow-x-auto scrollbar-none">
        {[
          { key: "all", label: "All Activity", icon: <Activity className="h-3.5 w-3.5" /> },
          { key: "tickets", label: "Ticket Updates", icon: <Layers className="h-3.5 w-3.5" /> },
          { key: "comments", label: "Comments", icon: <MessageSquare className="h-3.5 w-3.5" /> },
          { key: "files", label: "File Logs", icon: <Paperclip className="h-3.5 w-3.5" /> },
          { key: "assignments", label: "Assignments", icon: <UserPlus className="h-3.5 w-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors shrink-0 ${
              filter === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* Main timeline streams */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-card/20">
          <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2.5 animate-pulse" />
          <p className="text-xs font-bold text-muted-foreground">No matching activities found for this filter</p>
        </div>
      ) : (
        <div className="relative border-l border-border/80 ml-5.5 pl-7 py-2 space-y-6">
          {filteredActivities.map((act) => (
            <div key={act.id} className="relative group">
              {/* Timeline icon dot */}
              <div className="absolute -left-[43px] top-1.5 h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
                {getActivityIcon(act.type)}
              </div>

              {/* Activity Card */}
              <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm hover:border-border/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Description and metadata */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {act.user.image ? (
                    <img 
                      src={act.user.image} 
                      alt="" 
                      className="h-8 w-8 rounded-full object-cover border border-border/50 shrink-0" 
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {act.user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {renderDescription(act)}
                    </div>
                    {/* Secondary meta detail */}
                    {act.ticket && act.type !== "ticket_created" && (
                      <p className="text-[10px] text-muted-foreground/75 truncate mt-0.5 select-none">
                        Ticket Title: {act.ticket.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Relative timestamp */}
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground/80 font-bold self-end md:self-center select-none bg-muted/40 px-2.5 py-1 rounded-full border border-border/10">
                  <Calendar className="h-3 w-3 opacity-60" />
                  {formatRelativeTime(act.createdAt)}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
