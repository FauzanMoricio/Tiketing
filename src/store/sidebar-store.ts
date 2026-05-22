// ============================================================
// Sidebar Store — Zustand
// ============================================================
// Manages sidebar collapse state and expanded space sections.
// ============================================================

import { create } from "zustand";

interface SidebarState {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  /** Set of expanded space IDs */
  expandedSpaces: Set<string>;

  /** Toggle sidebar collapse */
  toggleCollapsed: () => void;
  /** Set sidebar collapse state */
  setCollapsed: (value: boolean) => void;
  /** Toggle a space's expanded state */
  toggleSpace: (spaceId: string) => void;
  /** Expand a specific space */
  expandSpace: (spaceId: string) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  expandedSpaces: new Set<string>(),

  toggleCollapsed: () =>
    set((state) => ({ isCollapsed: !state.isCollapsed })),

  setCollapsed: (value) => set({ isCollapsed: value }),

  toggleSpace: (spaceId) =>
    set((state) => {
      const next = new Set(state.expandedSpaces);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return { expandedSpaces: next };
    }),

  expandSpace: (spaceId) =>
    set((state) => {
      const next = new Set(state.expandedSpaces);
      next.add(spaceId);
      return { expandedSpaces: next };
    }),
}));
