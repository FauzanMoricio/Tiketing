"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FolderKanban, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { updateWorkspace, deleteWorkspace } from "@/actions/workspace.actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GeneralSettingsProps {
  workspace: { id: string; name: string };
  currentUserRole: string;
}

export function WorkspaceGeneralSettings({ workspace, currentUserRole }: GeneralSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const isOwner = currentUserRole === "owner";
  const isAdminOrOwner = ["owner", "admin"].includes(currentUserRole);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSavingName(true);
      await updateWorkspace(workspace.id, { name });
      router.refresh();
      toast.success("Workspace name updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update workspace name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== workspace.name) return;

    try {
      setIsDeleting(true);
      await deleteWorkspace(workspace.id);
      setDeleteConfirmOpen(false);
      // Redirect to home dashboard
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete workspace.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rename form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Workspace Settings</CardTitle>
          </div>
          <CardDescription>
            Rename your workspace below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                disabled={isSavingName || !isAdminOrOwner}
              />
            </div>
            {isAdminOrOwner && (
              <Button type="submit" size="sm" disabled={isSavingName || name === workspace.name}>
                {isSavingName ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
            {!isAdminOrOwner && (
              <p className="text-xs text-muted-foreground">
                Only Owners and Admins can change the workspace name.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <CardTitle className="text-base font-semibold">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Permanently delete this workspace and all of its spaces, projects, and tickets. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Workspace
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the workspace <strong className="text-foreground">{workspace.name}</strong> and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Please type <strong className="text-foreground select-none">{workspace.name}</strong> to confirm deletion.
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={workspace.name}
              disabled={isDeleting}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || confirmName !== workspace.name}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
