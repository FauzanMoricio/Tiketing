// ============================================================
// Workspace Overview Page
// ============================================================

import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getWorkspaceWithSpaces } from "@/actions/workspace.actions";
import {
  FolderKanban,
  Layers3,
  Plus,
  ArrowRight,
} from "lucide-react";

interface WorkspacePageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspacePage({
  params,
}: WorkspacePageProps) {
  const { workspaceId } = await params;
  const workspace = await getWorkspaceWithSpaces(workspaceId);

  if (!workspace) {
    notFound();
  }

  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: workspace.name },
  ];

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={breadcrumbs} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="text-muted-foreground">
            {workspace.spaces.length} spaces ·{" "}
            {workspace.spaces.reduce(
              (acc, s) => acc + s.projects.length,
              0
            )}{" "}
            projects
          </p>
        </div>

        {workspace.spaces.length === 0 ? (
          <EmptyState
            icon={Layers3}
            title="No spaces yet"
            description="Create your first space to start organizing your projects."
          />
        ) : (
          <div className="space-y-6">
            {workspace.spaces.map((space) => (
              <div key={space.id}>
                {/* Space Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: space.color || "#6b7280",
                    }}
                  >
                    <Layers3 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-base font-semibold">{space.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {space.projects.length} projects
                  </span>
                </div>

                {/* Projects Grid */}
                {space.projects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {space.projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/workspace/${workspace.id}/${space.id}/${project.id}`}
                      >
                        <Card className="group hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <FolderKanban className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-semibold">
                                  {project.name}
                                </h3>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {project.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground pl-8">
                    No projects in this space yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
