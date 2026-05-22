// ============================================================
// Settings Page — Secure Workspace Management
// ============================================================

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { WorkspaceSettingsContent } from "@/components/workspace/settings-content";
import { getWorkspaceMembers } from "@/actions/workspace.actions";

export default async function SettingsPage(props: {
  searchParams: Promise<{ workspaceId?: string; tab?: string }>
}) {
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Fetch user's active workspace
  const workspaceId = searchParams.workspaceId;
  const tab = searchParams.tab;

  // Find a workspace that matches workspaceId AND where the user is a member.
  // If no workspaceId, fetch the first workspace the user is a member of.
  const activeWorkspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { userId } }
    },
    include: {
      spaces: {
        orderBy: { createdAt: "asc" },
        include: {
          projects: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  }) || await prisma.workspace.findFirst({
    where: {
      members: { some: { userId } }
    },
    include: {
      spaces: {
        orderBy: { createdAt: "asc" },
        include: {
          projects: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground text-sm">No workspace found. Please create one.</p>
      </div>
    );
  }

  // 2. Fetch the current user's role in this active workspace
  const memberRecord = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: activeWorkspace.id,
        userId
      }
    }
  });

  if (!memberRecord) {
    return redirect("/login");
  }

  // 3. Fetch all members of this active workspace
  const members = await getWorkspaceMembers(activeWorkspace.id);

  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: "Settings" },
  ];

  return (
    <AppShell workspace={activeWorkspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your personal profile, security, workspace configuration, spaces, and members.
          </p>
        </div>

        <WorkspaceSettingsContent
          workspace={{
            id: activeWorkspace.id,
            name: activeWorkspace.name,
            spaces: activeWorkspace.spaces
          }}
          initialMembers={members}
          currentUserId={userId}
          currentUserRole={memberRecord.role}
          initialTab={tab}
        />
      </div>
    </AppShell>
  );
}
