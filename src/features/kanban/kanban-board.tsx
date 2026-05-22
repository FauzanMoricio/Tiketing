"use client";

// ============================================================
// Kanban Board — Main drag-and-drop board
// ============================================================

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { KanbanColumn } from "@/features/kanban/kanban-column";
import { TicketCard } from "@/features/kanban/ticket-card";
import { AddStatusButton } from "@/features/kanban/add-status-button";
import { CreateTicketModal } from "@/components/modals/create-ticket-modal";
import { useKanbanStore } from "@/store/kanban-store";
import { useModal } from "@/hooks/use-modal";
import {
  moveTicket,
  reorderTickets,
  deleteTicket,
} from "@/actions/ticket.actions";
import { deleteStatus, reorderStatuses } from "@/actions/status.actions";
import type { StatusWithTickets, TicketData } from "@/types";

interface KanbanBoardProps {
  projectId: string;
  initialColumns: StatusWithTickets[];
  members?: { user: { id: string; name: string | null; image: string | null } }[];
  currentUserRole: string;
}

export function KanbanBoard({
  projectId,
  initialColumns,
  members,
  currentUserRole,
}: KanbanBoardProps) {
  const router = useRouter();
  const {
    columns,
    setColumns,
    activeTicketId,
    setActiveTicketId,
    moveTicket: optimisticMove,
    removeTicket,
    removeColumn,
  } = useKanbanStore();

  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null);
  const ticketModal = useModal<string>(); // statusId

  // Initialize columns from server data
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns, setColumns]);

  // ── Sensors Configuration ──────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Find active ticket for DragOverlay ─────────────────────
  const activeTicket = useMemo(() => {
    if (!activeTicketId) return null;
    for (const col of columns) {
      const ticket = col.tickets.find((t) => t.id === activeTicketId);
      if (ticket) return ticket;
    }
    return null;
  }, [activeTicketId, columns]);

  // ── Find which column a ticket belongs to ──────────────────
  const findColumnByTicketId = useCallback(
    (ticketId: string) => {
      return columns.find((col) =>
        col.tickets.some((t) => t.id === ticketId)
      );
    },
    [columns]
  );

  // ── Drag Handlers ─────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    if (currentUserRole === "viewer") return;
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "column" && !["owner", "admin"].includes(currentUserRole)) {
      return;
    }

    if (type === "column") {
      setActiveColumnId(active.id as string);
    } else if (type === "ticket") {
      setActiveTicketId(active.id as string);
      const col = findColumnByTicketId(active.id as string);
      if (col) {
        setSourceColumnId(col.id);
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (currentUserRole === "viewer") return;
    const { active, over } = event;
    if (!over) return;

    // Only handle ticket card dragging over columns
    if (active.data.current?.type !== "ticket") return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTicketId(activeId);
    const overColumn =
      columns.find((c) => c.id === overId) ||
      findColumnByTicketId(overId);

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) {
      return;
    }

    // Move ticket to different column (optimistic)
    const activeIndex = activeColumn.tickets.findIndex(
      (t) => t.id === activeId
    );
    const overIndex =
      over.data.current?.type === "ticket"
        ? overColumn.tickets.findIndex((t) => t.id === overId)
        : overColumn.tickets.length;

    if (activeIndex === -1) return;

    optimisticMove(activeId, activeColumn.id, overColumn.id, overIndex);
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (currentUserRole === "viewer") return;
    const { active, over } = event;
    setActiveTicketId(null);
    setActiveColumnId(null);
    const draggedSourceCol = sourceColumnId; // Capture before resetting
    setSourceColumnId(null);

    console.log("handleDragEnd:", { activeId: active.id, overId: over?.id, draggedSourceCol });

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) {
      const currentColumn = findColumnByTicketId(activeId);
      if (!currentColumn || currentColumn.id === draggedSourceCol) {
        return;
      }
    }

    const activeType = active.data.current?.type;

    // 1. Column Reordering
    if (activeType === "column") {
      if (!["owner", "admin"].includes(currentUserRole)) return;
      const oldIndex = columns.findIndex((c) => c.id === activeId);
      const newIndex = columns.findIndex((c) => c.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        setColumns(newColumns);
        await reorderStatuses(projectId, newColumns.map((c) => c.id));
      }
      return;
    }

    // 2. Ticket Persist
    const targetColumn =
      columns.find((c) => c.id === overId) ||
      findColumnByTicketId(overId);
    
    console.log("targetColumn:", targetColumn?.id);
    if (!targetColumn) return;

    const isSameColumn = draggedSourceCol === targetColumn.id;
    console.log("isSameColumn:", isSameColumn);

    if (isSameColumn) {
      // Same column reorder
      const oldIndex = targetColumn.tickets.findIndex(
        (t) => t.id === activeId
      );
      const newIndex = targetColumn.tickets.findIndex(
        (t) => t.id === overId
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTickets = arrayMove(
          targetColumn.tickets,
          oldIndex,
          newIndex
        );

        const updatedColumns = columns.map((col) =>
          col.id === targetColumn.id
            ? { ...col, tickets: newTickets }
            : col
        );
        setColumns(updatedColumns);

        await reorderTickets(
          targetColumn.id,
          newTickets.map((t) => t.id)
        );
      }
    } else {
      // Cross-column move final position persist
      const isOverTicket = over.data.current?.type === "ticket";
      let position = 0;
      if (isOverTicket) {
        const overIndex = targetColumn.tickets.findIndex((t) => t.id === overId);
        position = overIndex !== -1 ? overIndex : targetColumn.tickets.length;
      } else {
        position = targetColumn.tickets.length;
      }

      console.log("calling moveTicket fail-safe:", activeId, targetColumn.id, position);
      await moveTicket(activeId, targetColumn.id, position);
      console.log("moveTicket completed");
    }
  }

  // ── Delete Handlers ────────────────────────────────────────
  async function handleDeleteTicket(ticketId: string) {
    if (currentUserRole === "viewer") return;
    removeTicket(ticketId);
    await deleteTicket(ticketId);
    router.refresh();
  }

  async function handleDeleteColumn(columnId: string) {
    if (!["owner", "admin"].includes(currentUserRole)) return;
    removeColumn(columnId);
    await deleteStatus(columnId);
    router.refresh();
  }

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 overflow-x-auto kanban-scroll h-full items-start">
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddTicket={(statusId) => ticketModal.open(statusId)}
                onDeleteTicket={handleDeleteTicket}
                onDeleteColumn={handleDeleteColumn}
                currentUserRole={currentUserRole}
              />
            ))}
          </SortableContext>

          {["owner", "admin"].includes(currentUserRole) && (
            <AddStatusButton projectId={projectId} />
          )}
        </div>

        {/* ── Drag Overlay ─────────────────────────────────────── */}
        <DragOverlay>
          {activeTicket ? (
            <div className="drag-overlay rounded-xl">
              <TicketCard ticket={activeTicket} currentUserRole={currentUserRole} />
            </div>
          ) : activeColumnId ? (
            <div className="drag-overlay rounded-xl opacity-80">
              <KanbanColumn
                column={columns.find((c) => c.id === activeColumnId)!}
                onAddTicket={() => {}}
                onDeleteTicket={() => {}}
                onDeleteColumn={() => {}}
                currentUserRole={currentUserRole}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Create Ticket Modal ──────────────────────────────── */}
      <CreateTicketModal
        projectId={projectId}
        statusId={ticketModal.data || ""}
        isOpen={ticketModal.isOpen}
        onClose={ticketModal.close}
        members={members}
      />
    </>
  );
}
