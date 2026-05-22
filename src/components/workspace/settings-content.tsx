"use client";

import { useState } from "react";
import { WorkspaceGeneralSettings } from "./general-settings";
import { WorkspaceSpacesSettings } from "./spaces-settings";
import { WorkspaceMembersSettings } from "./members-settings";
import { UserProfileSettings } from "./profile-settings";
import { cn } from "@/lib/utils";
import { FolderKanban, Users, Layers, User } from "lucide-react";

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

interface SettingsContentProps {
  workspace: { 
    id: string; 
    name: string;
    spaces: Space[];
  };
  initialMembers: Member[];
  currentUserId: string;
  currentUserRole: string;
  initialTab?: string;
}

export function WorkspaceSettingsContent({
  workspace,
  initialMembers,
  currentUserId,
  currentUserRole,
  initialTab,
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<"general" | "spaces" | "members" | "profile">(
    initialTab === "profile"
      ? "profile"
      : initialTab === "members" && ["owner", "admin"].includes(currentUserRole)
      ? "members"
      : initialTab === "spaces" && ["owner", "admin"].includes(currentUserRole)
      ? "spaces"
      : ["owner", "admin"].includes(currentUserRole)
      ? "general"
      : "profile"
  );

  return (
    <div className="space-y-6">
      {/* Visual Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4" />
          My Profile
        </button>
        {["owner", "admin"].includes(currentUserRole) && (
          <>
            <button
              onClick={() => setActiveTab("general")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
                activeTab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <FolderKanban className="h-4 w-4" />
              Workspace
            </button>
            <button
              onClick={() => setActiveTab("spaces")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
                activeTab === "spaces"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="h-4 w-4" />
              Manage Space
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
                activeTab === "members"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              Members
            </button>
          </>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === "profile" && (
        <UserProfileSettings />
      )}

      {activeTab === "general" && (
        <WorkspaceGeneralSettings
          workspace={workspace}
          currentUserRole={currentUserRole}
        />
      )}

      {activeTab === "spaces" && (
        <WorkspaceSpacesSettings
          workspaceId={workspace.id}
          spaces={workspace.spaces}
          currentUserRole={currentUserRole}
        />
      )}

      {activeTab === "members" && (
        <WorkspaceMembersSettings
          workspaceId={workspace.id}
          initialMembers={initialMembers}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
