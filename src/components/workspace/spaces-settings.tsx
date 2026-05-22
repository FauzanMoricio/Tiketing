"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Megaphone, 
  Code, 
  Hash, 
  Layers3, 
  FolderKanban, 
  Edit3, 
  Trash2, 
  Loader2, 
  Layers,
  Save,
  X
} from "lucide-react";
import { updateSpace, deleteSpace } from "@/actions/space.actions";
import { updateProject, deleteProject } from "@/actions/project.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SPACE_COLORS } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ICON_OPTIONS = [
  { name: "Code", icon: Code },
  { name: "Users", icon: Users },
  { name: "Megaphone", icon: Megaphone },
  { name: "Hash", icon: Hash },
  { name: "Layers3", icon: Layers3 },
  { name: "FolderKanban", icon: FolderKanban },
];

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface Space {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  projects: Project[];
}

interface SpacesSettingsProps {
  workspaceId: string;
  spaces: Space[];
  currentUserRole: string;
}

export function WorkspaceSpacesSettings({ spaces, currentUserRole }: SpacesSettingsProps) {
  const router = useRouter();
  const isAdminOrOwner = ["owner", "admin"].includes(currentUserRole);

  // Space editing states
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Hash");
  const [editColor, setEditColor] = useState("#6b7280");
  
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Project (Sub-category) editing states
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editProjName, setEditProjName] = useState("");
  const [isSavingProj, setIsSavingProj] = useState(false);
  const [deletingProjId, setDeletingProjId] = useState<string | null>(null);
  const [confirmDeleteProjId, setConfirmDeleteProjId] = useState<string | null>(null);

  const handleStartEdit = (space: Space) => {
    setEditingSpaceId(space.id);
    setEditName(space.name);
    setEditIcon(space.icon || "Hash");
    setEditColor(space.color || "#6b7280");
  };

  const handleCancelEdit = () => {
    setEditingSpaceId(null);
  };

  const handleSaveEdit = async (spaceId: string) => {
    if (!editName.trim()) {
      toast.error("Space name cannot be empty");
      return;
    }

    try {
      setIsSaving(true);
      await updateSpace(spaceId, {
        name: editName,
        icon: editIcon,
        color: editColor,
      });
      toast.success("Space updated successfully!");
      setEditingSpaceId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update space.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    try {
      setDeletingId(spaceId);
      await deleteSpace(spaceId);
      toast.success("Space deleted successfully!");
      setConfirmDeleteId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete space.");
    } finally {
      setDeletingId(null);
    }
  };

  // Project (Sub-category) Handlers
  const handleStartProjEdit = (proj: Project) => {
    setEditingProjId(proj.id);
    setEditProjName(proj.name);
  };

  const handleCancelProjEdit = () => {
    setEditingProjId(null);
  };

  const handleSaveProjEdit = async (projId: string) => {
    if (!editProjName.trim()) {
      toast.error("Project name cannot be empty");
      return;
    }

    try {
      setIsSavingProj(true);
      await updateProject(projId, {
        name: editProjName,
      });
      toast.success("Sub-category updated successfully!");
      setEditingProjId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update sub-category.");
    } finally {
      setIsSavingProj(false);
    }
  };

  const handleDeleteProj = async (projId: string) => {
    try {
      setDeletingProjId(projId);
      await deleteProject(projId);
      toast.success("Sub-category deleted successfully!");
      setConfirmDeleteProjId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete sub-category.");
    } finally {
      setDeletingProjId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Manage Space & Sub-categories</CardTitle>
          </div>
          <CardDescription>
            Edit names, colors, icons, or manage the sub-category projects inside each space.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {spaces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No spaces found in this workspace.</p>
          ) : (
            <div className="space-y-4">
              {spaces.map((space) => {
                const isEditing = editingSpaceId === space.id;

                return (
                  <div 
                    key={space.id} 
                    className={cn(
                      "border border-border/70 rounded-xl p-4 transition-all bg-card/50",
                      isEditing && "border-primary/40 bg-accent/10"
                    )}
                  >
                    {isEditing ? (
                      /* EDITING SPACE STATE */
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 space-y-2">
                            <Label>Space Name</Label>
                            <Input 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Engineering, Design..."
                              disabled={isSaving}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex flex-wrap gap-1.5 items-center pt-1.5">
                              {SPACE_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setEditColor(c)}
                                  className={cn(
                                    "h-6 w-6 rounded-full border border-background shadow transition-transform cursor-pointer",
                                    editColor === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Select Icon</Label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {ICON_OPTIONS.map((item) => {
                              const IconComponent = item.icon;
                              return (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => setEditIcon(item.name)}
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer",
                                    editIcon === item.name && "border-primary text-primary bg-primary/10 font-bold"
                                  )}
                                >
                                  <IconComponent className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleSaveEdit(space.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3.5 w-3.5 mr-1" />
                            )}
                            Save Space
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* NORMAL SPACE & SUB-CATEGORIES LIST STATE */
                      <div className="space-y-4 w-full">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                              style={{ backgroundColor: space.color || "#6b7280" }}
                            >
                              {(() => {
                                const found = ICON_OPTIONS.find(i => i.name === space.icon);
                                const IconComponent = found ? found.icon : Hash;
                                return <IconComponent className="h-5 w-5" />;
                              })()}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">{space.name}</h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {space.projects.length} {space.projects.length === 1 ? 'Sub-category' : 'Sub-categories'}
                              </p>
                            </div>
                          </div>

                          {isAdminOrOwner && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => handleStartEdit(space)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setConfirmDeleteId(space.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* SUB CATEGORIES LIST */}
                        <div className="pl-12 border-t border-border/30 pt-3 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                            Sub-categories (Projects)
                          </span>
                          
                          {space.projects.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic pl-1">No projects in this space.</p>
                          ) : (
                            <div className="space-y-2">
                              {space.projects.map((proj) => {
                                const isEditingProj = editingProjId === proj.id;

                                return (
                                  <div 
                                    key={proj.id}
                                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background/40 hover:bg-background/80 border border-border/20 transition-all"
                                  >
                                    {isEditingProj ? (
                                      /* EDIT PROJECT NAME INPUT */
                                      <div className="flex items-center gap-2 w-full">
                                        <FolderKanban className="h-4 w-4 text-muted-foreground/75 shrink-0" />
                                        <Input 
                                          value={editProjName}
                                          onChange={(e) => setEditProjName(e.target.value)}
                                          className="h-8 py-1 text-xs"
                                          disabled={isSavingProj}
                                        />
                                        <Button 
                                          size="sm" 
                                          className="h-8 text-xs px-2"
                                          onClick={() => handleSaveProjEdit(proj.id)}
                                          disabled={isSavingProj}
                                        >
                                          {isSavingProj ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-8 text-xs px-2"
                                          onClick={handleCancelProjEdit}
                                          disabled={isSavingProj}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      /* REGULAR PROJECT DISPLAY */
                                      <>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FolderKanban className="h-4 w-4 text-muted-foreground/75 shrink-0" />
                                          <span className="text-xs font-medium text-foreground truncate">
                                            {proj.name}
                                          </span>
                                        </div>
                                        
                                        {isAdminOrOwner && (
                                          <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                                              onClick={() => handleStartProjEdit(proj)}
                                            >
                                              <Edit3 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                              onClick={() => setConfirmDeleteProjId(proj.id)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Space Modal */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Delete Space
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this space? All associated projects and tickets will be permanently deleted. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingId !== null}
              onClick={() => confirmDeleteId && handleDeleteSpace(confirmDeleteId)}
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                "Delete Space"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project (Sub-category) Modal */}
      <Dialog open={confirmDeleteProjId !== null} onOpenChange={(open) => !open && setConfirmDeleteProjId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Delete Sub-category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this sub-category? All tickets inside this project will be deleted forever. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteProjId(null)}
              disabled={deletingProjId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingProjId !== null}
              onClick={() => confirmDeleteProjId && handleDeleteProj(confirmDeleteProjId)}
            >
              {deletingProjId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                "Delete Sub-category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
