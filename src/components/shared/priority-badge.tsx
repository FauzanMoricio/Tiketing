"use client";

// ============================================================
// Priority Badge — Visual indicator for ticket priority
// ============================================================

import { PRIORITY_CONFIG, type Priority } from "@/lib/constants";

interface PriorityBadgeProps {
  priority: Priority;
  size?: "sm" | "md";
}

export function PriorityBadge({
  priority,
  size = "sm",
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
      }}
    >
      {config.label}
    </span>
  );
}
