import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getProjectWithBoard } from "@/actions/project.actions";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import { ProjectMembers } from "@/features/project/project-members";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ActivityStream } from "@/features/activity/activity-stream";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
  }>;
}

export default async function ActivityPage({ params }: PageProps) {
  const { workspaceId, spaceId, projectId } = await params;

  const [project, workspace, session, statuses] = await Promise.all([
    getProjectWithBoard(projectId),
    getWorkspaceWithSpaces(workspaceId),
    auth(),
    prisma.status.findMany({
      where: { projectId },
      select: { id: true, name: true },
    }),
  ]);

  if (!project || !workspace) {
    notFound();
  }

  const statusMap = new Map(statuses.map((s) => [s.id, s.name]));

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
    { label: "Activity" },
  ];

  // Fetch real activities from the database
  const dbActivities = await prisma.ticketActivity.findMany({
    where: {
      ticket: {
        projectId: projectId,
      },
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
    orderBy: {
      createdAt: "desc",
    },
    take: 40,
  });

  // Fetch file upload logs from the database
  const dbFiles = await prisma.projectFile.findMany({
    where: {
      projectId,
    },
    include: {
      uploadedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  // Format and translate status UUIDs
  const formattedTicketActivities = dbActivities.map((act) => {
    let oldValue = act.oldValue;
    let newValue = act.newValue;

    if (act.type === "status_change") {
      oldValue = statusMap.get(act.oldValue || "") || act.oldValue || "Unknown";
      newValue = statusMap.get(act.newValue || "") || act.newValue || "Unknown";
    } else if (act.type === "assignee_change") {
      // If oldValue or newValue is user id, let's keep it or clear it. 
      // The action already sets user name or "Unassigned".
    }

    return {
      id: act.id,
      type: act.type,
      createdAt: act.createdAt,
      user: {
        name: act.user.name || act.user.email || "Member",
        image: act.user.image,
      },
      ticket: act.ticket,
      oldValue,
      newValue,
    };
  });

  // Format file uploads as activities
  const formattedFileActivities = dbFiles.map((file) => ({
    id: file.id,
    type: "file_uploaded",
    createdAt: file.createdAt,
    user: {
      name: file.uploadedBy.name || file.uploadedBy.email || "Member",
      image: file.uploadedBy.image,
    },
    ticket: null,
    oldValue: null,
    newValue: null,
    description: file.name,
  }));

  // Merge and sort all activities chronologically
  const unifiedActivities = [
    ...formattedTicketActivities,
    ...formattedFileActivities,
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="px-6 pt-4 pb-4 border-b border-border flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Project Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trace updates, assignments, uploads, and modifications across this project chronologically.
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
        <ActivityStream 
          activities={unifiedActivities} 
          workspaceId={workspaceId}
          spaceId={spaceId}
          projectId={projectId}
        />
      </div>
    </AppShell>
  );
}
