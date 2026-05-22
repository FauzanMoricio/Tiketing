"use client";

// ============================================================
// Kanban Column — Sortable & Droppable status column
// ============================================================

import { useMemo, useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { TicketCard } from "@/features/kanban/ticket-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Loader2,
  Check,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateStatus } from "@/actions/status.actions";
import type { StatusWithTickets } from "@/types";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  column: StatusWithTickets;
  onAddTicket: (statusId: string) => void;
  onDeleteTicket: (ticketId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  currentUserRole: string;
}

const COLORS = ["#94a3b8", "#3b82f6", "#eab308", "#a855f7", "#22c55e", "#ef4444"];

export function KanbanColumn({
  column,
  onAddTicket,
  onDeleteTicket,
  onDeleteColumn,
  currentUserRole,
}: KanbanColumnProps) {
  const router = useRouter();
  
  const isViewer = currentUserRole === "viewer";
  const isAdminOrOwner = ["owner", "admin"].includes(currentUserRole);

  // ── Sortable Column Setup ──────────────────────────────────
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column", column },
    disabled: !isAdminOrOwner,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // ── Column Editing State ───────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editColor, setEditColor] = useState(column.color);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateStatus(column.id, {
        name: editName.trim(),
        color: editColor,
      });
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const ticketIds = useMemo(
    () => column.tickets.map((t) => t.id),
    [column.tickets]
  );

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex flex-col w-[300px] min-w-[300px] rounded-xl transition-colors duration-200",
          "bg-muted/30 border border-border/50",
          isDragging && "border-primary/20 bg-background/50 cursor-grabbing"
        )}
      >
        {/* ── Column Header (Grabbable handle) ────────────────── */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="text-sm font-semibold truncate">
              {column.name}
            </h3>
            <span className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              {column.tickets.length}
            </span>
          </div>

          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {!isViewer && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onAddTicket(column.id)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            {isAdminOrOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-6 w-6 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit Column
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteColumn(column.id)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* ── Tickets List ─────────────────────────────────────── */}
        <ScrollArea className="flex-1 max-h-[calc(100vh-220px)]">
          <div className="flex flex-col gap-2 p-2 min-h-[60px]">
            <SortableContext
              items={ticketIds}
              strategy={verticalListSortingStrategy}
            >
              {column.tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onDelete={onDeleteTicket}
                  currentUserRole={currentUserRole}
                />
              ))}
            </SortableContext>

            {column.tickets.length === 0 && (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                Drop tickets here
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Add Ticket Button ────────────────────────────────── */}
        {!isViewer && (
          <div className="p-2 pt-0">
            <Button
              variant="ghost"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-start gap-1.5"
              onClick={() => onAddTicket(column.id)}
            >
              <Plus className="h-3.5 w-3" />
              Add ticket
            </Button>
          </div>
        )}
      </div>

      {/* ── Edit Column Dialog ───────────────────────────────── */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Status Column</DialogTitle>
            <DialogDescription>
              Change the status name and color indicator below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="col-name">Column Name</Label>
              <Input
                id="col-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. In Review"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Color Indicator</Label>
              <div className="flex gap-2.5 pt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full transition-transform flex items-center justify-center border border-black/10 dark:border-white/10",
                      editColor === c ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {editColor === c && (
                      <Check className="h-4 w-4 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!editName.trim() || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
