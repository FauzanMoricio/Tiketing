import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { TopNavbar } from "@/components/layout/top-navbar";
import { TicketDetailContent } from "@/components/ticket/ticket-detail-content";

export default async function TicketDetailPage(props: {
  params: Promise<{
    workspaceId: string;
    spaceId: string;
    projectId: string;
    ticketId: string;
  }>;
}) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const [ticket, workspace, projectStatuses, workspaceMembers, projectTickets] = await Promise.all([
    prisma.ticket.findFirst({
      where: { 
        ticketId: params.ticketId,
        project: {
          id: params.projectId,
          space: {
            id: params.spaceId,
            workspace: {
              id: params.workspaceId,
              members: { some: { userId: session.user.id } }
            }
          }
        }
      },
      include: {
        status: true,
        assignee: true,
        createdBy: true,
        project: {
          include: {
            space: true
          }
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" }
        },
        attachments: {
          orderBy: { createdAt: "desc" }
        },
        activities: {
          include: { user: true },
          orderBy: { createdAt: "desc" }
        },
        sourceRelations: {
          include: {
            targetTicket: {
              select: {
                id: true,
                ticketId: true,
                title: true,
                status: { select: { id: true, name: true, color: true } }
              }
            }
          }
        },
        targetRelations: {
          include: {
            sourceTicket: {
              select: {
                id: true,
                ticketId: true,
                title: true,
                status: { select: { id: true, name: true, color: true } }
              }
            }
          }
        }
      }
    }),
    prisma.workspace.findUnique({
      where: { 
        id: params.workspaceId,
        members: { some: { userId: session.user.id } }
      },
      include: {
        spaces: {
          orderBy: { createdAt: "asc" },
          include: {
            projects: {
              orderBy: { createdAt: "asc" },
            },
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
    }),
    prisma.status.findMany({
      where: { projectId: params.projectId },
      orderBy: { position: "asc" }
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: params.workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          }
        }
      }
    }),
    prisma.ticket.findMany({
      where: { projectId: params.projectId },
      select: {
        id: true,
        ticketId: true,
        title: true,
      }
    })
  ]);

  if (!ticket || !workspace) return notFound();

  const currentUserMember = workspace.members.find(m => m.userId === session.user!.id);
  const currentUserRole = currentUserMember?.role || "viewer";

  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    {
      label: workspace.name,
      href: `/workspace/${params.workspaceId}`,
    },
    { 
      label: ticket.project.name,
      href: `/workspace/${params.workspaceId}/${params.spaceId}/${params.projectId}`
    },
    { label: ticket.ticketId }
  ];

  return (
    <AppShell workspace={workspace}>
      <TopNavbar 
        breadcrumbs={breadcrumbs} 
        currentTicketId={ticket.id} 
        currentTicketIdReadable={ticket.ticketId} 
      />
      <TicketDetailContent
        initialTicket={ticket as any}
        projectStatuses={projectStatuses}
        workspaceMembers={workspaceMembers as any}
        currentUserId={session.user.id}
        currentUserImage={session.user.image || null}
        currentUserName={session.user.name || null}
        workspaceId={params.workspaceId}
        spaceId={params.spaceId}
        projectId={params.projectId}
        projectTickets={projectTickets}
        currentUserRole={currentUserRole}
      />
    </AppShell>
  );
}
