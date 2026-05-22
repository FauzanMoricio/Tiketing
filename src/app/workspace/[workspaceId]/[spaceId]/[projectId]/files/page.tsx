import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getProjectWithBoard } from "@/actions/project.actions";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import { getProjectFilesAndFolders } from "@/actions/file.actions";
import { ProjectMembers } from "@/features/project/project-members";
import { auth } from "@/auth";
import { FilesExplorer } from "@/features/files/files-explorer";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
  }>;
}

export default async function FilesPage({ params }: PageProps) {
  const { workspaceId, spaceId, projectId } = await params;

  const [project, workspace, session, fileData] = await Promise.all([
    getProjectWithBoard(projectId),
    getWorkspaceWithSpaces(workspaceId),
    auth(),
    getProjectFilesAndFolders(projectId),
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
    { label: "Files" },
  ];

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="px-6 pt-4 pb-4 border-b border-border flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Store, preview, and share all assets and files linked to this project.
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
        <FilesExplorer
          projectId={projectId}
          workspaceId={workspaceId}
          spaceId={spaceId}
          initialFolders={fileData.folders}
          initialFiles={fileData.files as any}
          isViewer={currentUserRole === "viewer"}
        />
      </div>
    </AppShell>
  );
}
