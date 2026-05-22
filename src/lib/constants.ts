// ============================================================
// App Constants
// ============================================================

/** Priority levels for tickets */
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Priority display configuration */
export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bgColor: string }
> = {
  low: {
    label: "Low",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.15)",
  },
  medium: {
    label: "Medium",
    color: "#eab308",
    bgColor: "rgba(234, 179, 8, 0.15)",
  },
  high: {
    label: "High",
    color: "#f97316",
    bgColor: "rgba(249, 115, 22, 0.15)",
  },
  urgent: {
    label: "Urgent",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
  },
};

/** Default statuses for new projects */
export const DEFAULT_STATUSES = [
  { name: "Open", color: "#6366f1", position: 0 },
  { name: "In Progress", color: "#3b82f6", position: 1 },
  { name: "Done", color: "#22c55e", position: 2 },
  { name: "QA", color: "#eab308", position: 3 },
  { name: "In Discuss", color: "#8b5cf6", position: 4 },
  { name: "Resolved", color: "#10b981", position: 5 },
  { name: "Hold", color: "#f97316", position: 6 },
  { name: "Close", color: "#475569", position: 7 },
  { name: "Cannot Fixed", color: "#ef4444", position: 8 },
];

/** Available status colors for picker */
export const STATUS_COLORS = [
  "#6b7280",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
];

/** Available space colors */
export const SPACE_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#14b8a6",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#6366f1",
];
