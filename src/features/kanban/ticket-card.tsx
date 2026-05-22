"use client";

// ============================================================
// Ticket Card — Draggable kanban card
// ============================================================

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import {
  GripVertical,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TicketData } from "@/types";
import type { Priority } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useRouter, useParams } from "next/navigation";

interface TicketCardProps {
  ticket: TicketData;
  onDelete?: (ticketId: string) => void;
  currentUserRole?: string;
}

export function TicketCard({ ticket, onDelete, currentUserRole }: TicketCardProps) {
  const router = useRouter();
  const params = useParams();

  const isViewer = currentUserRole === "viewer";
  const isAdminOrOwner = ["owner", "admin"].includes(currentUserRole || "viewer");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: {
      type: "ticket",
      ticket,
    },
    disabled: isViewer,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Format due date
  const formattedDueDate = ticket.dueDate
    ? new Date(ticket.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  // Check if overdue
  const isOverdue =
    ticket.dueDate && new Date(ticket.dueDate) < new Date();

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on dropdown or drag handle
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    router.push(`/workspace/${params.workspaceId}/${params.spaceId}/${params.projectId}/ticket/${ticket.ticketId}`);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={cn(
        "group relative p-3 bg-card border border-border rounded-xl",
        isViewer ? "cursor-pointer" : "cursor-grab",
        "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
        "transition-all duration-200 ease-out",
        isDragging && "opacity-40 rotate-2 scale-95 shadow-xl"
      )}
    >
      {/* ── Header: TicketID + Menu ────────────────────────────── */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {!isViewer && (
            <div
              className="flex items-center -ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-muted-foreground tracking-tight">
            {ticket.ticketId}
          </span>
        </div>

        {isAdminOrOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger data-no-drag className="flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-6 w-6 opacity-0 group-hover:opacity-100 transition-all">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-no-drag>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(ticket.id);
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── Title ────────────────────────────────────────────── */}
      <h4 className="text-sm font-medium leading-tight mb-2">
        {ticket.title}
      </h4>

      {/* ── Labels ───────────────────────────────────────────── */}
      {ticket.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {ticket.labels.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-normal"
            >
              {label}
            </Badge>
          ))}
        </div>
      )}

      {/* ── Footer: Priority, Date, Comments, Assignee ───────── */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority as Priority} />

          {formattedDueDate && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px]",
                isOverdue
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {formattedDueDate}
            </span>
          )}

          {ticket.comments && ticket.comments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {ticket.comments.length}
            </span>
          )}
        </div>

        {ticket.assignee && (
          <Avatar className="h-6 w-6 border border-border">
            <AvatarImage src={ticket.assignee.image || ""} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {ticket.assignee.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </Card>
  );
}
