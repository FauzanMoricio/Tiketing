// ============================================================
// Kanban Store — Zustand
// ============================================================
// Manages kanban board state for optimistic drag-and-drop updates.
// ============================================================

import { create } from "zustand";
import type { StatusWithTickets, TicketData } from "@/types";

interface KanbanState {
  /** Board columns with tickets */
  columns: StatusWithTickets[];
  /** Currently active (dragging) ticket ID */
  activeTicketId: string | null;

  /** Initialize board data from server */
  setColumns: (columns: StatusWithTickets[]) => void;
  /** Set active dragging ticket */
  setActiveTicketId: (id: string | null) => void;

  /** Move ticket between columns (optimistic) */
  moveTicket: (
    ticketId: string,
    fromStatusId: string,
    toStatusId: string,
    newPosition: number
  ) => void;

  /** Add a ticket to a column */
  addTicket: (ticket: TicketData) => void;
  /** Update a ticket in place */
  updateTicket: (ticketId: string, data: Partial<TicketData>) => void;
  /** Remove a ticket */
  removeTicket: (ticketId: string) => void;

  /** Add a new status column */
  addColumn: (column: StatusWithTickets) => void;
  /** Update a status column */
  updateColumn: (
    columnId: string,
    data: Partial<StatusWithTickets>
  ) => void;
  /** Remove a status column */
  removeColumn: (columnId: string) => void;
  /** Reorder columns */
  reorderColumns: (orderedIds: string[]) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  columns: [],
  activeTicketId: null,

  setColumns: (columns) => set({ columns }),

  setActiveTicketId: (id) => set({ activeTicketId: id }),

  moveTicket: (ticketId, fromStatusId, toStatusId, newPosition) =>
    set((state) => {
      const columns = state.columns.map((col) => ({
        ...col,
        tickets: [...col.tickets],
      }));

      // Find and remove ticket from source column
      const sourceCol = columns.find((c) => c.id === fromStatusId);
      if (!sourceCol) return state;

      const ticketIndex = sourceCol.tickets.findIndex(
        (t) => t.id === ticketId
      );
      if (ticketIndex === -1) return state;

      const [ticket] = sourceCol.tickets.splice(ticketIndex, 1);

      // Update ticket's status
      const updatedTicket: TicketData = {
        ...ticket,
        statusId: toStatusId,
        position: newPosition,
      };

      // Insert into target column
      const targetCol = columns.find((c) => c.id === toStatusId);
      if (!targetCol) return state;

      targetCol.tickets.splice(newPosition, 0, updatedTicket);

      // Update positions in both columns
      sourceCol.tickets.forEach((t, i) => {
        t.position = i;
      });
      targetCol.tickets.forEach((t, i) => {
        t.position = i;
      });

      return { columns };
    }),

  addTicket: (ticket) =>
    set((state) => {
      const columns = state.columns.map((col) => {
        if (col.id === ticket.statusId) {
          return { ...col, tickets: [...col.tickets, ticket] };
        }
        return col;
      });
      return { columns };
    }),

  updateTicket: (ticketId, data) =>
    set((state) => {
      const columns = state.columns.map((col) => ({
        ...col,
        tickets: col.tickets.map((t) =>
          t.id === ticketId ? { ...t, ...data } : t
        ),
      }));
      return { columns };
    }),

  removeTicket: (ticketId) =>
    set((state) => {
      const columns = state.columns.map((col) => ({
        ...col,
        tickets: col.tickets.filter((t) => t.id !== ticketId),
      }));
      return { columns };
    }),

  addColumn: (column) =>
    set((state) => ({ columns: [...state.columns, column] })),

  updateColumn: (columnId, data) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.id === columnId ? { ...col, ...data } : col
      ),
    })),

  removeColumn: (columnId) =>
    set((state) => ({
      columns: state.columns.filter((col) => col.id !== columnId),
    })),

  reorderColumns: (orderedIds) =>
    set((state) => {
      const colMap = new Map(state.columns.map((c) => [c.id, c]));
      const reordered = orderedIds
        .map((id, index) => {
          const col = colMap.get(id);
          if (!col) return null;
          return { ...col, position: index };
        })
        .filter(Boolean) as StatusWithTickets[];
      return { columns: reordered };
    }),
}));
