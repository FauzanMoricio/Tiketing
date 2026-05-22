"use client";

// ============================================================
// Create Space Modal
// ============================================================

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { createSpace } from "@/actions/space.actions";
import { SPACE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CreateSpaceModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSpaceModal({
  workspaceId,
  isOpen,
  onClose,
}: CreateSpaceModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SPACE_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await createSpace({
        workspaceId,
        name: name.trim(),
        color,
        icon: "Hash",
      });
      setName("");
      setColor(SPACE_COLORS[0]);
      onClose();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Create New Space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="space-name">Name</Label>
              <Input
                id="space-name"
                placeholder="e.g., Marketing, Engineering..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SPACE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full transition-all duration-200",
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                        : "hover:scale-105"
                    )}
                    style={{
                      backgroundColor: c,
                      "--tw-ring-color": c,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
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
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
