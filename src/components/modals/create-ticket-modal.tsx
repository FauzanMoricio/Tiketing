"use client";

// ============================================================
// Create Ticket Modal
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTicket, getProjectTickets, addTicketRelation } from "@/actions/ticket.actions";
import { PRIORITIES, PRIORITY_CONFIG, type Priority } from "@/lib/constants";
import { useKanbanStore } from "@/store/kanban-store";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import type { TicketData } from "@/types";
import { toast } from "sonner";

interface CreateTicketModalProps {
  projectId: string;
  statusId: string;
  isOpen: boolean;
  onClose: () => void;
  members?: { user: { id: string; name: string | null; image: string | null } }[];
  initialRelationType?: string;
  initialRelationTicketId?: string;
}

export function CreateTicketModal({
  projectId,
  statusId,
  isOpen,
  onClose,
  members,
  initialRelationType,
  initialRelationTicketId,
}: CreateTicketModalProps) {
  const router = useRouter();
  const addTicket = useKanbanStore((s) => s.addTicket);
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelsStr, setLabelsStr] = useState("");

  // Relation States
  const [relationType, setRelationType] = useState(initialRelationType || "");
  const [relatedTicketId, setRelatedTicketId] = useState(initialRelationTicketId || "");
  const [projectTickets, setProjectTickets] = useState<Array<{ id: string; ticketId: string; title: string }>>([]);

  useEffect(() => {
    setRelationType((prev) => {
      const next = initialRelationType || "";
      return prev === next ? prev : next;
    });
  }, [initialRelationType]);

  useEffect(() => {
    setRelatedTicketId((prev) => {
      const next = initialRelationTicketId || "";
      return prev === next ? prev : next;
    });
  }, [initialRelationTicketId]);

  useEffect(() => {
    if (isOpen && initialRelationType) {
      getProjectTickets(projectId)
        .then((tickets) => {
          setProjectTickets(tickets);
        })
        .catch((err) => console.error("Failed to load project tickets for relations:", err));
    }
  }, [isOpen, projectId, initialRelationType]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignee("");
    setDueDate("");
    setLabelsStr("");
    setRelationType(initialRelationType || "");
    setRelatedTicketId(initialRelationTicketId || "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const labels = labelsStr
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      const ticket = await createTicket({
        projectId,
        statusId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assignee.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        labels,
      });

      if (initialRelationType && relatedTicketId) {
        try {
          await addTicketRelation({
            sourceTicketId: ticket.id,
            targetTicketId: relatedTicketId,
            type: relationType,
          });
          toast.success("Relationship created successfully");
        } catch (relationErr) {
          console.error("Failed to automatically link ticket relation:", relationErr);
          toast.error("Ticket created, but failed to link relationship");
        }
      }

      // Optimistic update
      addTicket(ticket as unknown as TicketData);

      resetForm();
      onClose();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="ticket-title">Title</Label>
              <Input
                id="ticket-title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="ticket-desc">Description</Label>
              <Textarea
                id="ticket-desc"
                placeholder="Add more details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Priority + Assignee Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(val) => val && setPriority(val)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(val) => {
                        const p = val as Priority;
                        if (!p || !PRIORITY_CONFIG[p]) return "";
                        return (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: PRIORITY_CONFIG[p].color,
                              }}
                            />
                            {PRIORITY_CONFIG[p].label}
                          </div>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: PRIORITY_CONFIG[p].color,
                            }}
                          />
                          {PRIORITY_CONFIG[p].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-assignee">Assignee</Label>
                <Select value={assignee || "unassigned"} onValueChange={(val) => setAssignee(val === "unassigned" || !val ? "" : val)}>
                  <SelectTrigger id="ticket-assignee" className="w-full">
                    <SelectValue placeholder="Unassigned">
                      {(val) => {
                        if (!val || val === "unassigned") return "Unassigned";
                        const member = members?.find((m) => m.user.id === val);
                        return member?.user.name || "Unknown";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.user.id} value={m.user.id}>
                        {m.user.name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date + Labels Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ticket-due">Due Date</Label>
                <Input
                  id="ticket-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-labels">Labels</Label>
                <Input
                  id="ticket-labels"
                  placeholder="bug, frontend..."
                  value={labelsStr}
                  onChange={(e) => setLabelsStr(e.target.value)}
                />
              </div>
            </div>

            {/* Relation Section (Shown only if initialRelationType is provided) */}
            {initialRelationType && (
              <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
                <div className="space-y-2">
                  <Label>Relation Type</Label>
                  <Select value={relationType} onValueChange={(val) => val && setRelationType(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select relation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relates_to">Relates To</SelectItem>
                      <SelectItem value="is_required_for">Is Required For</SelectItem>
                      <SelectItem value="depends_on">Depends On</SelectItem>
                      <SelectItem value="is_duplicated_by">Is Duplicated By</SelectItem>
                      <SelectItem value="duplicates">Duplicates</SelectItem>
                      <SelectItem value="parent_for">Parent For</SelectItem>
                      <SelectItem value="subtask_of">Subtask Of</SelectItem>
                      <SelectItem value="clones">Clones</SelectItem>
                      <SelectItem value="is_cloned_by">Is Cloned By</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticket-relation">Related Ticket</Label>
                  <Select value={relatedTicketId || "unselected"} onValueChange={(val) => setRelatedTicketId(val === "unselected" || !val ? "" : val)}>
                    <SelectTrigger id="ticket-relation" className="w-full">
                      <SelectValue placeholder="Select ticket to relate">
                        {(val) => {
                          if (!val || val === "unselected") return "None";
                          const t = projectTickets.find((item) => item.id === val);
                          return t ? `${t.ticketId} - ${t.title}` : "None";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unselected">None</SelectItem>
                      {projectTickets.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="font-semibold text-primary">{t.ticketId}</span> - {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
