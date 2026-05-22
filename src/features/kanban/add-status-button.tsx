"use client";

// ============================================================
// Add Status Button — Add new kanban column
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStatus } from "@/actions/status.actions";
import { useKanbanStore } from "@/store/kanban-store";
import { STATUS_COLORS } from "@/lib/constants";
import { Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusWithTickets } from "@/types";

interface AddStatusButtonProps {
  projectId: string;
}

export function AddStatusButton({ projectId }: AddStatusButtonProps) {
  const router = useRouter();
  const addColumn = useKanbanStore((s) => s.addColumn);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(STATUS_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const status = await createStatus({
        projectId,
        name: name.trim(),
        color,
      });

      // Optimistic add
      addColumn({ ...status, tickets: [] } as StatusWithTickets);

      setName("");
      setColor(STATUS_COLORS[0]);
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  if (!isEditing) {
    return (
      <Button
        variant="outline"
        className="flex items-center gap-2 w-[300px] min-w-[300px] h-10 border-dashed"
        onClick={() => setIsEditing(true)}
      >
        <Plus className="h-4 w-4" />
        Add Status
      </Button>
    );
  }

  return (
    <div className="w-[300px] min-w-[300px] rounded-xl border border-border bg-card p-3 space-y-3">
      <Input
        placeholder="Status name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setIsEditing(false);
        }}
      />

      <div className="flex flex-wrap gap-1.5">
        {STATUS_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn(
              "h-5 w-5 rounded-full transition-all",
              color === c && "ring-2 ring-offset-1 ring-offset-background scale-110"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!name.trim() || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Add"
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(false)}
          disabled={isLoading}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
