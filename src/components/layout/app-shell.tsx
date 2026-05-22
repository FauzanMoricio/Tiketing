// ============================================================
// App Shell — Main layout wrapper (Sidebar + Content)
// ============================================================

import { Sidebar } from "@/components/layout/sidebar";
import type { WorkspaceWithSpaces } from "@/types";
import { getWorkspaces } from "@/actions/workspace.actions";

interface AppShellProps {
  workspace: WorkspaceWithSpaces | null;
  children: React.ReactNode;
}

export async function AppShell({ workspace, children }: AppShellProps) {
  const userWorkspaces = await getWorkspaces();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspace={workspace} userWorkspaces={userWorkspaces} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
