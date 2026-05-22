"use client";

// ============================================================
// Sidebar Component — ClickUp-style navigation
// ============================================================

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ChevronRight,
  FolderKanban,
  Plus,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Hash,
  Users,
  Megaphone,
  Code,
  Layers3,
  X,
  LogOut,
  Sparkles,
  CalendarRange,
  Flag,
  MessageSquare,
  Files,
  BarChart3,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebarStore } from "@/store/sidebar-store";
import { cn } from "@/lib/utils";
import type { WorkspaceWithSpaces } from "@/types";
import { CreateSpaceModal } from "@/components/modals/create-space-modal";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { CreateWorkspaceModal } from "@/components/modals/create-workspace-modal";
import { useModal } from "@/hooks/use-modal";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { signOut } from "next-auth/react";

// ── Icon mapping for space icons ────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Megaphone,
  Code,
  Hash,
  Layers3,
  FolderKanban,
};

function getSpaceIcon(iconName: string | null) {
  if (!iconName) return Hash;
  return ICON_MAP[iconName] || Hash;
}

interface SidebarProps {
  workspace: WorkspaceWithSpaces | null;
  userWorkspaces: { id: string; name: string }[];
}

export function Sidebar({ workspace, userWorkspaces }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isCollapsed, toggleCollapsed, setCollapsed, expandedSpaces, toggleSpace } =
    useSidebarStore();

  // Auto-collapse sidebar on smaller screen sizes (laptops, tablets < 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 1024) {
          setCollapsed(true);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setCollapsed]);

  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string; image: string | null; role?: string } | null>(null);

  useEffect(() => {
    const loadSession = () => {
      fetch("/api/auth/session")
        .then((res) => {
          if (!res.ok) {
            console.warn("Sidebar: Failed to fetch active user session.");
            return null;
          }
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            console.warn("Sidebar: Received non-JSON session response.");
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
          }
        })
        .catch((err) => {
          console.warn("Failed to load user session in sidebar:", err);
        });
    };

    loadSession();

    window.addEventListener("visibilitychange", loadSession);
    window.addEventListener("focus", loadSession);
    window.addEventListener("profile-update", loadSession);

    return () => {
      window.removeEventListener("visibilitychange", loadSession);
      window.removeEventListener("focus", loadSession);
      window.removeEventListener("profile-update", loadSession);
    };
  }, []);

  const spaceModal = useModal<string>();
  const projectModal = useModal<string>();

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "[" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCollapsed]);

  const isActive = useCallback(
    (path: string) => pathname === path,
    [pathname]
  );
  
  const currentMemberRole = workspace?.members?.find(m => m.userId === user?.id)?.role || "viewer";
  const isWorkspaceAdminOrOwner = ["owner", "admin"].includes(currentMemberRole);

  const match = pathname.match(/^\/workspace\/([^/]+)\/([^/]+)\/([^/]+)/);
  const activeWorkspaceId = match?.[1];
  const activeSpaceId = match?.[2];
  const activeProjectId = match?.[3];

  const activeProject = workspace?.spaces
    .flatMap((s) => s.projects)
    .find((p) => p.id === activeProjectId);
  const activeProjectName = activeProject?.name || "Project";

  return (
    <>
      <aside
        className={cn(
          "flex flex-col h-screen border-r border-border bg-sidebar transition-all duration-300 ease-in-out overflow-hidden select-none",
          isCollapsed ? "w-[60px]" : "w-[260px]"
        )}
      >
        {/* ── Workspace Header ─────────────────────────────── */}
        <div className="flex items-center justify-between h-14 px-2 border-b border-border">
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden pr-2">
              <WorkspaceSwitcher
                workspaces={userWorkspaces}
                currentWorkspace={workspace}
                isCollapsed={isCollapsed}
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 shrink-0", isCollapsed && "mx-auto")}
            onClick={toggleCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0 py-2">
          {/* ── Main Navigation: Dashboard ───────────────────── */}
          <div className="px-2 space-y-0.5">
            <NavItem
              href={workspace ? `/?workspaceId=${workspace.id}` : "/"}
              icon={LayoutDashboard}
              label="Dashboard"
              isActive={isActive("/")}
              isCollapsed={isCollapsed}
            />
          </div>

          <Separator className="my-3 mx-2" />

          {/* ── Spaces Section ───────────────────────────────── */}
          {!isCollapsed && (
            <div className="px-3 mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Spaces
              </span>
              {workspace && isWorkspaceAdminOrOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => spaceModal.open(workspace.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          <div className="px-2 space-y-0.5">
            {workspace?.spaces.map((space) => {
              const SpaceIcon = getSpaceIcon(space.icon);
              const isExpanded = expandedSpaces.has(space.id);

              return (
                <div key={space.id}>
                  {/* Space Header */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSpace(space.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSpace(space.id);
                      }
                    }}
                    className={cn(
                      "flex items-center w-full rounded-md px-2 py-1.5 text-sm transition-smooth hover:bg-accent group cursor-pointer",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    {!isCollapsed && (
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 mr-1.5 shrink-0 text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                      />
                    )}
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                      style={{ backgroundColor: space.color || "#6b7280" }}
                    >
                      <SpaceIcon className="h-3 w-3 text-white" />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="ml-2 truncate text-sm select-none">
                          {space.name}
                        </span>
                        {isWorkspaceAdminOrOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              projectModal.open(space.id);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Projects Under Space */}
                  {isExpanded && !isCollapsed && (
                    <div className="ml-5 mt-0.5 space-y-0.5">
                      {space.projects.map((project) => {
                        const projectPath = `/workspace/${workspace.id}/${space.id}/${project.id}`;
                        return (
                          <Link
                            key={project.id}
                            href={projectPath}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-smooth hover:bg-accent",
                              isActive(projectPath) &&
                                "bg-accent text-accent-foreground font-medium"
                            )}
                          >
                            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{project.name}</span>
                          </Link>
                        );
                      })}
                      {space.projects.length === 0 && (
                        <p className="text-xs text-muted-foreground px-2 py-1">
                          No projects yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Management Section ────────────────────────────── */}
          {activeProjectId && workspace && (
            <>
              <Separator className="my-3 mx-2" />
              {!isCollapsed && (
                <div className="px-3 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Management
                  </span>
                </div>
              )}
              <div className="px-2 space-y-0.5">
                <NavItem
                  href={`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}`}
                  icon={FolderKanban}
                  label="Board"
                  isActive={
                    pathname === `/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}` ||
                    pathname.includes(`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/ticket/`)
                  }
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href={`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/timeline`}
                  icon={CalendarRange}
                  label="Timeline"
                  isActive={pathname === `/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/timeline`}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href={`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/milestone`}
                  icon={Flag}
                  label="Milestone"
                  isActive={pathname === `/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/milestone`}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href={`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/discussion`}
                  icon={MessageSquare}
                  label="Discussion"
                  isActive={pathname === `/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/discussion`}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href={`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/files`}
                  icon={Files}
                  label="Files"
                  isActive={pathname === `/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/files`}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href={`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/reports`}
                  icon={BarChart3}
                  label="Reports"
                  isActive={pathname === `/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/reports`}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href={`/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/activity`}
                  icon={Activity}
                  label="Activity"
                  isActive={pathname === `/workspace/${workspace.id}/${activeSpaceId}/${activeProjectId}/activity`}
                  isCollapsed={isCollapsed}
                />
              </div>
            </>
          )}

          <Separator className="my-3 mx-2" />

          {/* ── Members Section ───────────────────────────────── */}
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="px-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Members
                </span>
                <button
                  type="button"
                  className="text-[10px] text-primary hover:underline font-medium cursor-pointer bg-transparent border-0"
                  onClick={() => setIsMembersDrawerOpen(true)}
                >
                  See All
                </button>
              </div>

              {/* Horizontal overlapping avatar group */}
              <div className="px-3 py-1 flex items-center">
                <div 
                  className="flex -space-x-1.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsMembersDrawerOpen(true)}
                >
                  {workspace?.members?.slice(0, 5).map((member) => {
                    const userName = member.user.name || member.user.email || "User";
                    const userAvatar = member.user.image;
                    const userInitial = userName.charAt(0).toUpperCase();

                    return (
                      <div 
                        key={member.id} 
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-sidebar bg-card relative shrink-0 overflow-hidden"
                        title={userName}
                      >
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={userName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary text-[10px] font-bold">
                            {userInitial}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {workspace?.members && workspace.members.length > 5 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-sidebar bg-muted text-[9px] font-bold text-muted-foreground shrink-0 select-none">
                      +{workspace.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed view: Show single members icon with total count badge */
            <div className="flex flex-col items-center py-1">
              <button
                type="button"
                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors relative bg-transparent border-0"
                onClick={() => setIsMembersDrawerOpen(true)}
                title="Workspace Members"
              >
                <Users className="h-4 w-4" />
                {workspace?.members && workspace.members.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground ring-1 ring-background">
                    {workspace.members.length}
                  </span>
                )}
              </button>
            </div>
          )}

          <Separator className="my-3 mx-2" />

          {/* ── Settings Section ─────────────────────────────── */}
          <div className="px-2 space-y-0.5">
            {user?.role === "admin" && (
              <NavItem
                href="/admin"
                icon={Sparkles}
                label="Admin Panel"
                isActive={pathname.startsWith("/admin")}
                isCollapsed={isCollapsed}
              />
            )}
            <NavItem
              href={workspace ? `/settings?workspaceId=${workspace.id}` : "/settings"}
              icon={Settings}
              label={isWorkspaceAdminOrOwner ? "Manage Workspace" : "Settings"}
              isActive={pathname.startsWith("/settings")}
              isCollapsed={isCollapsed}
            />
          </div>
        </ScrollArea>

        {/* User profile footer at bottom-left */}
        {user && (
          <div className="mt-auto shrink-0 border-t border-border bg-sidebar/50 backdrop-blur supports-[backdrop-filter]:bg-sidebar/30 relative z-10">
            {isCollapsed ? (
              <div className="p-3 flex items-center justify-center">
                <Link
                  href={workspace ? `/settings?workspaceId=${workspace.id}&tab=profile` : "/settings?tab=profile"}
                  title="Profile Settings"
                  className="flex h-8 w-8 rounded-full border border-border overflow-hidden hover:opacity-80 transition-opacity ring-2 ring-primary/10 hover:ring-primary/20 shrink-0"
                >
                  <Avatar className="h-full w-full">
                    {user.image && <AvatarImage src={user.image} alt={user.name} className="object-cover" />}
                    <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                      {(user.name || user.email || "M").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            ) : (
              <div className="p-3 flex items-center justify-between gap-2 overflow-hidden">
                <Link
                  href={workspace ? `/settings?workspaceId=${workspace.id}&tab=profile` : "/settings?tab=profile"}
                  className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity cursor-pointer group/profile-btn"
                  title="Profile Settings"
                >
                  <Avatar className="h-8 w-8 border border-border shrink-0 group-hover/profile-btn:border-primary/50 transition-colors">
                    {user.image && <AvatarImage src={user.image} alt={user.name} className="object-cover" />}
                    <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                      {(user.name || user.email || "M").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate group-hover/profile-btn:text-primary transition-colors">
                      {user.name || "My Account"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Log Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Modals */}
      {workspace && (
        <CreateSpaceModal
          workspaceId={spaceModal.data || workspace.id}
          isOpen={spaceModal.isOpen}
          onClose={spaceModal.close}
        />
      )}
      <CreateProjectModal
        spaceId={projectModal.data || ""}
        isOpen={projectModal.isOpen}
        onClose={projectModal.close}
      />

      {/* ── Members Slider Drawer (Right Side) ──────────────── */}
      {isMembersDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsMembersDrawerOpen(false)}
        >
          <div 
            className="w-full max-w-sm h-full bg-background border-l border-border shadow-2xl flex flex-col p-6 space-y-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Workspace Members</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing active members in {workspace?.name}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsMembersDrawerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {workspace?.members?.map((member) => {
                  const userName = member.user.name || member.user.email || "User";
                  const userAvatar = member.user.image;
                  const userInitial = userName.charAt(0).toUpperCase();

                  return (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/30"
                    >
                      <div className="relative">
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={userName}
                            className="h-9 w-9 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                            {userInitial}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {userName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user.email}
                        </p>
                      </div>
                      <div className="shrink-0 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary capitalize">
                        {member.role.toLowerCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}

// ── NavItem Sub-component ─────────────────────────────────────
interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive: active,
  isCollapsed,
}: NavItemProps) {
  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-md px-2 py-1.5 text-sm transition-smooth hover:bg-accent",
        active && "bg-accent text-accent-foreground font-medium",
        isCollapsed && "justify-center px-0"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isCollapsed ? "" : "mr-2",
          active ? "text-primary" : "text-muted-foreground"
        )}
      />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}
