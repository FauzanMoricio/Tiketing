import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getProjectWithBoard } from "@/actions/project.actions";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import { ProjectMembers } from "@/features/project/project-members";
import { auth } from "@/auth";
import { CalendarRange, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

import { TimelineView } from "@/features/timeline/timeline-view";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
  }>;
}

export default async function TimelinePage({ params }: PageProps) {
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
    {
      label: project.name,
      href: `/workspace/${workspaceId}/${spaceId}/${projectId}`,
    },
    { label: "Timeline" },
  ];

  // Extract all tickets from project statuses for Gantt rendering
  const allTickets = project.statuses.flatMap((status) => 
    status.tickets.map((t) => ({ ...t, status: { name: status.name } }))
  );

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="px-6 pt-4 pb-4 border-b border-border flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize your project schedule, sprint durations, and task timelines.
          </p>
        </div>
        <ProjectMembers 
          members={project.space.workspace.members as any} 
          workspaceId={workspaceId}
          currentUserRole={currentUserRole}
        />
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <TimelineView 
          initialTickets={allTickets}
          members={project.space.workspace.members as any}
          isViewer={currentUserRole === "viewer"}
        />
      </div>
    </AppShell>
  );
}
