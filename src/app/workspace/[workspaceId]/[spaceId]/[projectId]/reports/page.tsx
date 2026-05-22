import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getProjectWithBoard } from "@/actions/project.actions";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import { ProjectMembers } from "@/features/project/project-members";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReportsDashboard } from "@/features/reports/reports-dashboard";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
  }>;
}

export default async function ReportsPage({ params }: PageProps) {
  const { workspaceId, spaceId, projectId } = await params;

  const [project, workspace, session, dbTickets, dbActivities] = await Promise.all([
    getProjectWithBoard(projectId),
    getWorkspaceWithSpaces(workspaceId),
    auth(),
    prisma.ticket.findMany({
      where: { projectId },
      include: {
        status: true,
        assignee: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ticketActivity.findMany({
      where: {
        ticket: { projectId },
      },
      include: {
        user: true,
        ticket: {
          select: {
            id: true,
            ticketId: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
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
    { label: "Reports" },
  ];

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="px-6 pt-4 pb-4 border-b border-border flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor sprint progress, productivity, burn downs, and workload distribution.
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

      <div className="p-6 flex-1 overflow-y-auto min-h-0">
        <ReportsDashboard
          tickets={dbTickets as any}
          activities={dbActivities as any}
          workspaceMembers={project.space.workspace.members as any}
          isViewer={currentUserRole === "viewer"}
        />
      </div>
    </AppShell>
  );
}
