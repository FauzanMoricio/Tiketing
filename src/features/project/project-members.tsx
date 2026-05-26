"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { inviteWorkspaceMember } from "@/actions/workspace.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
  };
}

interface ProjectMembersProps {
  members: ProjectMember[];
  workspaceId: string;
  currentUserRole: string;
}

export function ProjectMembers({ members, workspaceId, currentUserRole }: ProjectMembersProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "Failed to invite member. Make sure they have registered an account.");
    } finally {
      setIsInviting(false);
    }
  };

  const isAdminOrOwner = ["owner", "admin"].includes(currentUserRole);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2 overflow-hidden">
          {members?.map((member) => (
            <Avatar key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background border border-border">
              <AvatarImage src={member.user.image || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {(member.user.name || member.user.email || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        {isAdminOrOwner && (
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full border-dashed cursor-pointer" 
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Invite members</span>
          </Button>
        )}
      </div>

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
                  <SelectValue>
                    {(val) => {
                      if (val === "admin") return "Admin (Manage Spaces & Settings)";
                      if (val === "member") return "Member (Create & Edit Tickets)";
                      if (val === "viewer") return "Viewer (Read-Only)";
                      return val;
                    }}
                  </SelectValue>
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
    </>
  );
}
