// ============================================================
// Project Board Page — Kanban board for a specific project
// ============================================================

import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { KanbanBoard } from "@/features/kanban/kanban-board";
import { getProjectWithBoard } from "@/actions/project.actions";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import { ProjectMembers } from "@/features/project/project-members";
import { auth } from "@/auth";

interface ProjectBoardPageProps {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
  }>;
}

export default async function ProjectBoardPage({
  params,
}: ProjectBoardPageProps) {
  const { workspaceId, spaceId, projectId } = await params;

  const [project, workspace, session] = await Promise.all([
    getProjectWithBoard(projectId),
    getWorkspaceWithSpaces(workspaceId),
    auth(),
  ]);

  if (!project || !workspace) {
    notFound();
  }

  const currentUserRole = project.space.workspace.members.find(
    (m: any) => m.userId === session?.user?.id
  )?.role || "viewer";

  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    {
      label: project.space.workspace.name,
      href: `/workspace/${workspaceId}`,
    },
    { label: project.name },
  ];

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      {/* ── Board Header ───────────────────────────────────── */}
      <div className="px-6 pt-4 pb-4 border-b border-border flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {project.description}
            </p>
          )}
        </div>
        <ProjectMembers 
          members={project.space.workspace.members as any} 
          workspaceId={workspaceId}
          currentUserRole={currentUserRole}
        />
      </div>

      {/* ── Kanban Board ───────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          projectId={projectId}
          initialColumns={project.statuses as any}
          members={project.space.workspace.members as any}
          currentUserRole={currentUserRole}
        />
      </div>
    </AppShell>
  );
}
