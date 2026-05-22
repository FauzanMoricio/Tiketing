"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Shield, ShieldAlert, ShieldCheck, UserX, Loader2 } from "lucide-react";
import { inviteWorkspaceMember, updateWorkspaceMemberRole, removeWorkspaceMember } from "@/actions/workspace.actions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface MembersSettingsProps {
  workspaceId: string;
  initialMembers: Member[];
  currentUserId: string;
  currentUserRole: string;
}

export function WorkspaceMembersSettings({
  workspaceId,
  initialMembers,
  currentUserId,
  currentUserRole,
}: MembersSettingsProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isOwner = currentUserRole === "owner";
  const isAdminOrOwner = ["owner", "admin"].includes(currentUserRole);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      await inviteWorkspaceMember(workspaceId, inviteEmail.trim(), inviteRole);
      setInviteOpen(false);
      setInviteEmail("");
      router.refresh();
      toast.success("Member invited successfully!");
      // The page will refresh and pass down the new members prop
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "Failed to invite member. Make sure they have registered an account.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateWorkspaceMemberRole(workspaceId, memberId, newRole);
      router.refresh();
      toast.success("Role updated successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update role.");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      setIsRemoving(true);
      await removeWorkspaceMember(workspaceId, memberId);
      router.refresh();
      toast.success("Member removed successfully!");
      setConfirmRemoveId(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to remove member.");
    } finally {
      setIsRemoving(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      case "admin":
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      case "member":
        return <Shield className="h-4 w-4 text-emerald-500" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Workspace Members</CardTitle>
            </div>
            <CardDescription>
              Manage members and access roles for this workspace.
            </CardDescription>
          </div>
          {isAdminOrOwner && (
            <Button size="sm" onClick={() => setInviteOpen(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {initialMembers.map((member) => {
              const isSelf = member.userId === currentUserId;
              const isTargetOwner = member.role === "owner";
              const isTargetAdmin = member.role === "admin";
              const canModify =
                isAdminOrOwner &&
                !isTargetOwner &&
                (!isTargetAdmin || isOwner) &&
                !isSelf;

              return (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {member.user.name?.charAt(0) || member.user.email?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {member.user.name || "Invited User"}
                        {isSelf && (
                          <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-normal">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role indicator / selection */}
                    {canModify ? (
                      <Select
                        key={`${member.id}-${member.role}`}
                        defaultValue={member.role}
                        onValueChange={(val) => val && handleRoleChange(member.id, val)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1 bg-muted rounded-md capitalize">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </div>
                    )}

                    {/* Remove Member */}
                    {canModify && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmRemoveId(member.id)}
                        title="Remove member"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Add a new member to this workspace. They must already have an account on Tiket.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-4">
            {errorMsg && (
              <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-md border border-destructive/20">
                {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isInviting}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Workspace Role</Label>
              <Select value={inviteRole} onValueChange={(val) => val && setInviteRole(val)} disabled={isInviting}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (Manage Spaces & Settings)</SelectItem>
                  <SelectItem value="member">Member (Create & Edit Tickets)</SelectItem>
                  <SelectItem value="viewer">Viewer (Read-Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                {isInviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Invite"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Modal */}
      <Dialog open={confirmRemoveId !== null} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              Remove Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member? They will lose access to all spaces and projects in this workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRemoveId(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRemoving}
              onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
