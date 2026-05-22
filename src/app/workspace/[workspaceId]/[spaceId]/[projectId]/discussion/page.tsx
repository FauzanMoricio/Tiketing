import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getProjectWithBoard } from "@/actions/project.actions";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import { getProjectDiscussions } from "@/actions/discussion.actions";
import { ProjectMembers } from "@/features/project/project-members";
import { auth } from "@/auth";
import { DiscussionBoardView } from "@/features/discussion/discussion-board-view";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
  }>;
}

export default async function DiscussionPage({ params }: PageProps) {
  const { workspaceId, spaceId, projectId } = await params;

  const [project, workspace, session, discussions] = await Promise.all([
    getProjectWithBoard(projectId),
    getWorkspaceWithSpaces(workspaceId),
    auth(),
    getProjectDiscussions(projectId),
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
    { label: "Discussion" },
  ];

  const currentUser = {
    id: session?.user?.id || "",
    name: session?.user?.name || "User",
    image: session?.user?.image || null
  };

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="px-6 pt-4 pb-4 border-b border-border flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Discussion Board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share roadmap planning, brainstorm ideas, publish meeting notes, and reply to your teammates.
          </p>
        </div>
        <ProjectMembers 
          members={project.space.workspace.members as any} 
          workspaceId={workspaceId}
          currentUserRole={currentUserRole}
        />
      </div>

      <div className="p-6 flex-1 min-h-0">
        <DiscussionBoardView 
          projectId={projectId}
          initialDiscussions={discussions as any}
          currentUser={currentUser}
        />
      </div>
    </AppShell>
  );
}
