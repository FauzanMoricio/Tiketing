"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Workspace } from "@prisma/client";
import { useModal } from "@/hooks/use-modal";
import { CreateWorkspaceModal } from "../modals/create-workspace-modal";

interface WorkspaceSwitcherProps {
  workspaces: Pick<Workspace, "id" | "name">[];
  currentWorkspace: Pick<Workspace, "id" | "name"> | null;
  isCollapsed: boolean;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  isCollapsed,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const createModal = useModal();

  if (isCollapsed) return null;

  const onWorkspaceSelect = (workspaceId: string) => {
    setOpen(false);
    router.push(`/workspace/${workspaceId}`);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label="Select a workspace"
          className={cn(
            "flex items-center w-full justify-between hover:bg-accent rounded px-2 py-1.5 text-left outline-none cursor-pointer",
            isCollapsed && "justify-center px-0"
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate">
                {currentWorkspace?.name || "Tiket"}
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
              {currentWorkspace?.name?.charAt(0) || "T"}
            </div>
          )}
          {!isCollapsed && (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]" align="start">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Workspaces</div>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onWorkspaceSelect(workspace.id)}
              className="text-sm cursor-pointer"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold mr-2">
                {workspace.name.charAt(0)}
              </div>
              <span className="truncate">{workspace.name}</span>
              {currentWorkspace?.id === workspace.id && (
                <Check className="ml-auto h-4 w-4 opacity-100" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              createModal.open();
            }}
            className="cursor-pointer text-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
      />
    </>
  );
}
