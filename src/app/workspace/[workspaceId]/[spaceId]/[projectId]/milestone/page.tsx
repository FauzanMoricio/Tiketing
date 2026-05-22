import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getProjectWithBoard } from "@/actions/project.actions";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import { getProjectMilestones } from "@/actions/milestone.actions";
import { ProjectMembers } from "@/features/project/project-members";
import { auth } from "@/auth";
import { MilestoneListView } from "@/features/milestone/milestone-list-view";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
  }>;
}

export default async function MilestonePage({ params }: PageProps) {
  const { workspaceId, spaceId, projectId } = await params;

  const [project, workspace, session, milestones] = await Promise.all([
    getProjectWithBoard(projectId),
    getWorkspaceWithSpaces(workspaceId),
    auth(),
    getProjectMilestones(projectId),
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
    { label: "Milestones" },
  ];

  // Extract all project tickets for checklist linking
  const projectTickets = project.statuses.flatMap((status) => 
    status.tickets.map((t) => ({ 
      id: t.id, 
      ticketId: t.ticketId, 
      title: t.title, 
      statusName: status.name 
    }))
  );

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="px-6 pt-4 pb-4 border-b border-border flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Milestones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set targets, bundle tasks into sprints or releases, and measure completion progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProjectMembers 
            members={project.space.workspace.members as any} 
            workspaceId={workspaceId}
            currentUserRole={currentUserRole}
          />
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <MilestoneListView 
          projectId={projectId}
          workspaceId={workspaceId}
          spaceId={spaceId}
          initialMilestones={milestones as any}
          projectTickets={projectTickets}
          isViewer={currentUserRole === "viewer"}
        />
      </div>
    </AppShell>
  );
}
