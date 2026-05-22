// ============================================================
// Dashboard Page — Main landing page
// ============================================================

import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Layers3,
  FolderKanban,
  TicketCheck,
  Briefcase,
  ArrowRight,
  Clock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PriorityBadge } from "@/components/shared/priority-badge";
import type { Priority } from "@/lib/constants";
import Link from "next/link";

import { auth } from "@/auth";

async function getDashboardData(workspaceId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      workspace: null,
      totalSpaces: 0,
      totalProjects: 0,
      totalTickets: 0,
      recentTickets: [],
      userName: "User",
    };
  }
  
  const userId = session.user.id;
  const userName = session.user.name || "User";

  // Find the workspace
  let activeWorkspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { userId } }
    },
    include: {
      spaces: {
        orderBy: { createdAt: "asc" },
        include: {
          projects: { orderBy: { createdAt: "asc" } },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // Fallback if not found or not specified
  if (!activeWorkspace) {
    activeWorkspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId } } },
      include: {
        spaces: {
          orderBy: { createdAt: "asc" },
          include: {
            projects: { orderBy: { createdAt: "asc" } },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  if (!activeWorkspace) {
    return {
      workspace: null,
      totalSpaces: 0,
      totalProjects: 0,
      totalTickets: 0,
      recentTickets: [],
      userName,
    };
  }

  const [totalSpaces, totalProjects, totalTickets, recentTickets] = await Promise.all([
    prisma.space.count({
      where: { workspaceId: activeWorkspace.id }
    }),
    prisma.project.count({
      where: { space: { workspaceId: activeWorkspace.id } }
    }),
    prisma.ticket.count({
      where: { project: { space: { workspaceId: activeWorkspace.id } } }
    }),
    prisma.ticket.findMany({
      where: { project: { space: { workspaceId: activeWorkspace.id } } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        status: { select: { name: true, color: true } },
        project: { select: { name: true } },
      },
    }),
  ]);

  return {
    workspace: activeWorkspace,
    totalSpaces,
    totalProjects,
    totalTickets,
    recentTickets,
    userName,
  };
}

interface DashboardPageProps {
  searchParams: Promise<{ workspaceId?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { workspaceId } = await searchParams;
  const {
    workspace,
    totalSpaces,
    totalProjects,
    totalTickets,
    recentTickets,
    userName,
  } = await getDashboardData(workspaceId);

  const stats = [
    {
      label: "Workspaces",
      value: workspace ? 1 : 0,
      icon: Briefcase,
      color: "#8b5cf6",
    },
    {
      label: "Spaces",
      value: totalSpaces,
      icon: Layers3,
      color: "#3b82f6",
    },
    {
      label: "Projects",
      value: totalProjects,
      icon: FolderKanban,
      color: "#f97316",
    },
    {
      label: "Tickets",
      value: totalTickets,
      icon: TicketCheck,
      color: "#22c55e",
    },
  ];

  return (
    <AppShell workspace={workspace}>
      <TopNavbar breadcrumbs={[{ label: "Dashboard" }]} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Welcome Section ──────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening in your workspace.
          </p>
        </div>

        {/* ── Stats Grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="group hover:border-primary/30 transition-all duration-200"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <stat.icon
                      className="h-5 w-5"
                      style={{ color: stat.color }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Content Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tickets */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Tickets</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: ticket.status.color,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {ticket.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ticket.project.name} · {ticket.status.name}
                        </p>
                      </div>
                    </div>
                    <PriorityBadge
                      priority={ticket.priority as Priority}
                    />
                  </div>
                ))}
                {recentTickets.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No tickets yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Access */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workspace?.spaces.map((space) =>
                space.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/workspace/${workspace.id}/${space.id}/${project.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {space.name}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))
              )}
              {(!workspace || workspace.spaces.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No projects yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
