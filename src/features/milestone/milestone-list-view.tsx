"use client";

import { useState, useTransition } from "react";
import { 
  Flag, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X, 
  AlertCircle,
  Link
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  createMilestone, 
  updateMilestone, 
  deleteMilestone 
} from "@/actions/milestone.actions";

interface LinkedTicket {
  id: string;
  ticketId: string;
  title: string;
  status: {
    name: string;
  };
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string; // ACTIVE, COMPLETED, PLANNING
  dueDate: Date;
  tickets: LinkedTicket[];
}

interface ProjectTicket {
  id: string;
  ticketId: string;
  title: string;
  statusName: string;
}

interface MilestoneListViewProps {
  projectId: string;
  workspaceId: string;
  spaceId: string;
  initialMilestones: Milestone[];
  projectTickets: ProjectTicket[];
  isViewer: boolean;
}

export function MilestoneListView({ 
  projectId, 
  workspaceId,
  spaceId,
  initialMilestones, 
  projectTickets,
  isViewer 
}: MilestoneListViewProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isPending, startTransition] = useTransition();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [dueDateString, setDueDateString] = useState("");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingMilestone(null);
    setTitle("");
    setDescription("");
    setStatus("ACTIVE");
    setDueDateString(new Date().toISOString().split("T")[0]);
    setSelectedTicketIds([]);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (m: Milestone) => {
    setEditingMilestone(m);
    setTitle(m.title);
    setDescription(m.description || "");
    setStatus(m.status);
    setDueDateString(new Date(m.dueDate).toISOString().split("T")[0]);
    setSelectedTicketIds(m.tickets.map(t => t.id));
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDateString) {
      toast.error("Please fill in the title and due date.");
      return;
    }

    const dueDate = new Date(dueDateString);
    startTransition(async () => {
      try {
        if (editingMilestone) {
          // Update
          await updateMilestone(editingMilestone.id, {
            title,
            description: description || null,
            dueDate,
            status,
            ticketIds: selectedTicketIds,
          });

          toast.success("Milestone updated successfully");
          
          setMilestones(prev => 
            prev.map(m => {
              if (m.id !== editingMilestone.id) return m;
              const updatedTickets = projectTickets
                .filter(t => selectedTicketIds.includes(t.id))
                .map(t => ({
                  id: t.id,
                  ticketId: t.ticketId,
                  title: t.title,
                  status: { name: t.statusName }
                }));
              return {
                ...m,
                title,
                description: description || null,
                status,
                dueDate,
                tickets: updatedTickets
              };
            })
          );
        } else {
          // Create
          const created = await createMilestone({
            projectId,
            title,
            description: description || undefined,
            dueDate,
            status,
            ticketIds: selectedTicketIds,
          });

          toast.success("Milestone created successfully");
          
          const createdTickets = projectTickets
            .filter(t => selectedTicketIds.includes(t.id))
            .map(t => ({
              id: t.id,
              ticketId: t.ticketId,
              title: t.title,
              status: { name: t.statusName }
            }));

          setMilestones(prev => [
            ...prev, 
            {
              id: created.id,
              title,
              description: description || null,
              status,
              dueDate,
              tickets: createdTickets
            }
          ]);
        }
        setIsModalOpen(false);
      } catch (err) {
        toast.error("Failed to save milestone");
      }
    });
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    startTransition(async () => {
      try {
        await deleteMilestone(deleteTargetId);
        toast.success("Milestone deleted successfully");
        setMilestones(prev => prev.filter(m => m.id !== deleteTargetId));
        setDeleteTargetId(null);
      } catch (err) {
        toast.error("Failed to delete milestone");
      }
    });
  };

  // Toggle Ticket Checklist selection
  const handleToggleTicket = (ticketId: string) => {
    setSelectedTicketIds(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId) 
        : [...prev, ticketId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex items-center justify-between bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Flag className="h-4 w-4 text-primary" />
          <span>Active Milestones: <strong>{milestones.filter(m => m.status === "ACTIVE").length}</strong></span>
        </div>
        {!isViewer && (
          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" />
            New Milestone
          </Button>
        )}
      </div>

      {/* Milestones list grid */}
      {milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/40 rounded-2xl text-center">
          <Flag className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Milestones Yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Create milestones to set sprint checkpoints, release goals, and track ticket completion progress.
          </p>
          {!isViewer && (
            <Button size="sm" variant="outline" onClick={handleOpenCreate} className="mt-4 rounded-xl">
              Create your first milestone
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {milestones.map((m) => {
            const totalTickets = m.tickets.length;
            const completedTickets = m.tickets.filter(t => t.status?.name.toLowerCase() === "done").length;
            const progressPercent = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;
            const isOverdue = new Date(m.dueDate) < new Date() && m.status !== "COMPLETED";

            return (
              <div 
                key={m.id} 
                className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5 hover:border-border/80 transition-colors"
              >
                {/* Top header row */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Flag className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-sm font-bold text-foreground truncate">{m.title}</h3>
                      
                      <span 
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          m.status === "COMPLETED" 
                            ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                            : m.status === "ACTIVE" 
                            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" 
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {m.status}
                      </span>

                      {isOverdue && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase shrink-0 flex items-center gap-0.5">
                          <AlertCircle className="h-2.5 w-2.5" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground max-w-3xl">
                      {m.description || "No description provided."}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  {!isViewer && (
                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(m)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10"
                        onClick={() => setDeleteTargetId(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Progress bar block */}
                <div className="space-y-2 bg-muted/10 border border-border/20 rounded-xl p-4">
                  <div className="flex justify-between text-xs items-center">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-muted-foreground font-medium">Completion Progress</span>
                    </div>
                    <div className="text-[10px] font-bold text-foreground">
                      {completedTickets} of {totalTickets} Tickets Completed ({progressPercent}%)
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.status === "COMPLETED" ? "bg-green-500" : "bg-primary"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Linked tickets list */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Link className="h-3 w-3" />
                    <span>Linked Tickets ({totalTickets})</span>
                  </div>
                  {totalTickets === 0 ? (
                    <span className="text-xs text-muted-foreground/60 italic block">No tickets linked to this milestone yet.</span>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {m.tickets.map(ticket => (
                        <a
                          key={ticket.id}
                          href={`/workspace/${workspaceId}/${spaceId}/${projectId}/ticket/${ticket.ticketId}`}
                          className="flex items-center justify-between p-2.5 bg-background border border-border/50 rounded-xl hover:border-primary/40 hover:bg-muted/10 transition-all text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-primary shrink-0">{ticket.ticketId}</span>
                            <span className="font-semibold text-foreground truncate">{ticket.title}</span>
                          </div>
                          <span 
                            className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                              ticket.status?.name.toLowerCase() === "done"
                                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                : ticket.status?.name.toLowerCase() === "in progress"
                                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {ticket.status?.name}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Due Date Indicator */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/20">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Target Date: <strong>{new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT DIALOG OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Flag className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-foreground">
                  {editingMilestone ? "Edit Milestone" : "Create Milestone"}
                </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Milestone Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. v1.0.0 Alpha Launch" 
                  className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the milestone goals and targets..." 
                  className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Due Date</label>
                  <input 
                    type="date" 
                    value={dueDateString}
                    onChange={(e) => setDueDateString(e.target.value)}
                    className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="PLANNING">PLANNING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              {/* Linked tickets list checklist */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-muted-foreground uppercase block">Link Tickets to Milestone</label>
                {projectTickets.length === 0 ? (
                  <span className="text-xs text-muted-foreground/60 italic block">No tickets available to link in this project.</span>
                ) : (
                  <div className="border border-border/80 rounded-xl max-h-[160px] overflow-y-auto divide-y divide-border/40 bg-background">
                    {projectTickets.map(ticket => {
                      const isChecked = selectedTicketIds.includes(ticket.id);
                      return (
                        <div 
                          key={ticket.id} 
                          onClick={() => handleToggleTicket(ticket.id)}
                          className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0 flex items-center justify-between text-xs">
                            <span className="text-[10px] font-bold text-primary shrink-0 mr-2">{ticket.ticketId}</span>
                            <span className="font-medium text-foreground truncate flex-1">{ticket.title}</span>
                            <span className="text-[8px] font-bold px-1.5 rounded uppercase ml-2 bg-muted text-muted-foreground">
                              {ticket.statusName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl text-xs h-9"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="rounded-xl text-xs h-9 px-5"
                >
                  {isPending ? "Saving..." : editingMilestone ? "Save Changes" : "Create Milestone"}
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
                <h3 className="text-xs font-bold text-foreground">Delete Milestone?</h3>
                <p className="text-[10px] text-muted-foreground">This action cannot be undone. Milestone progress will be lost.</p>
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
                onClick={handleDeleteConfirm}
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
