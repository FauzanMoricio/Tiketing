"use server";

// ============================================================
// Ticket Server Actions
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

import { auth } from "@/auth";
import { generateTicketIdAndCreateTicket } from "@/lib/ticket-generation";

/** Create a new ticket */
export async function createTicket(data: {
  projectId: string;
  statusId: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: Date;
  labels?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const maxPosition = await prisma.ticket.aggregate({
    where: { statusId: data.statusId },
    _max: { position: true },
  });

  const position = (maxPosition._max.position ?? -1) + 1;

  const ticket = await generateTicketIdAndCreateTicket({
    ...data,
    priority: data.priority || "medium",
    createdById: session.user.id,
    position,
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket.id,
      userId: session.user.id,
      type: "ticket_created",
    }
  });

  revalidatePath("/", "layout");
  return ticket;
}

/** Update a ticket */
export async function updateTicket(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: string;
    assigneeId?: string | null;
    dueDate?: Date | null;
    labels?: string[];
    statusId?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const oldTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!oldTicket) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
  });

  const activities = [];
  
  if (data.title !== undefined && data.title !== oldTicket.title) {
    activities.push({ ticketId: id, userId, type: "title_change", field: "title", oldValue: oldTicket.title, newValue: data.title });
  }
  if (data.description !== undefined && data.description !== oldTicket.description) {
    activities.push({ ticketId: id, userId, type: "description_change", field: "description" });
  }
  if (data.priority !== undefined && data.priority !== oldTicket.priority) {
    activities.push({ ticketId: id, userId, type: "priority_change", field: "priority", oldValue: oldTicket.priority, newValue: data.priority });
  }
  if (data.statusId !== undefined && data.statusId !== oldTicket.statusId) {
    activities.push({ ticketId: id, userId, type: "status_change", field: "status", oldValue: oldTicket.statusId, newValue: data.statusId });
  }
  if (data.assigneeId !== undefined && data.assigneeId !== oldTicket.assigneeId) {
    activities.push({ ticketId: id, userId, type: "assignee_change", field: "assignee", oldValue: oldTicket.assigneeId, newValue: data.assigneeId });
  }
  if (data.dueDate !== undefined && data.dueDate?.getTime() !== oldTicket.dueDate?.getTime()) {
    activities.push({ ticketId: id, userId, type: "due_date_change", field: "dueDate", oldValue: oldTicket.dueDate?.toISOString(), newValue: data.dueDate?.toISOString() });
  }
  if (data.labels !== undefined) {
    const oldLabels = oldTicket.labels || [];
    const newLabels = data.labels || [];
    if (JSON.stringify(oldLabels) !== JSON.stringify(newLabels)) {
       activities.push({ ticketId: id, userId, type: "labels_change", field: "labels", oldValue: oldLabels.join(","), newValue: newLabels.join(",") });
    }
  }

  if (activities.length > 0) {
    await prisma.ticketActivity.createMany({ data: activities });
  }

  revalidatePath("/", "layout");
  return ticket;
}

/** Delete a ticket */
export async function deleteTicket(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.ticket.delete({ where: { id } });
  revalidatePath("/", "layout");
}

/** Move a ticket to a different status column at a specific position */
export async function moveTicket(
  ticketId: string,
  newStatusId: string,
  newPosition: number
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  console.log("SERVER ACTION: moveTicket triggered:", { ticketId, newStatusId, newPosition, userId });

  const oldTicket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { statusId: true } });

  await prisma.$transaction(async (tx) => {
    // Shift existing tickets in the new column down to make room
    await tx.ticket.updateMany({
      where: {
        statusId: newStatusId,
        position: { gte: newPosition },
        id: { not: ticketId }, // Don't shift the ticket we are about to move if it's already there
      },
      data: {
        position: { increment: 1 },
      },
    });

    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        statusId: newStatusId,
        position: newPosition,
      },
    });

    if (oldTicket && oldTicket.statusId !== newStatusId) {
      await tx.ticketActivity.create({
        data: {
          ticketId,
          userId: userId,
          type: "status_change",
          oldValue: oldTicket.statusId,
          newValue: newStatusId,
        }
      });
    }
  });

  revalidatePath("/", "layout");
}

/** Reorder tickets within a status column */
export async function reorderTickets(
  statusId: string,
  orderedIds: string[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const updates = orderedIds.map((id, index) =>
    prisma.ticket.update({
      where: { id },
      data: { position: index },
    })
  );

  await prisma.$transaction(updates);
  revalidatePath("/", "layout");
}

/** Get dashboard statistics for current user */
export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [totalWorkspaces, totalSpaces, totalProjects, totalTickets] =
    await Promise.all([
      prisma.workspaceMember.count({ where: { userId } }),
      prisma.space.count({ where: { workspace: { members: { some: { userId } } } } }),
      prisma.project.count({ where: { space: { workspace: { members: { some: { userId } } } } } }),
      prisma.ticket.count({ where: { project: { space: { workspace: { members: { some: { userId } } } } } } }),
    ]);

  const ticketsByPriority = await prisma.ticket.groupBy({
    by: ["priority"],
    where: { assigneeId: userId },
    _count: { id: true },
  });

  const recentTickets = await prisma.ticket.findMany({
    where: { project: { space: { workspace: { members: { some: { userId } } } } } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      status: { select: { name: true, color: true } },
      project: { select: { name: true, ticketPrefix: true } },
    }
  });

  return {
    totalWorkspaces,
    totalSpaces,
    totalProjects,
    totalTickets,
    ticketsByPriority: Object.fromEntries(
      ticketsByPriority.map((g) => [g.priority, g._count.id])
    ),
    recentTickets,
  };
}

/** Add a comment to a ticket */
export async function createComment(ticketId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const comment = await prisma.comment.create({
    data: {
      ticketId,
      userId,
      content,
    },
    include: {
      user: true,
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId,
      userId,
      type: "comment_added",
      newValue: content.slice(0, 100),
    },
  });

  revalidatePath("/", "layout");
  return comment;
}

/** Add an attachment to a ticket */
export async function createAttachment(
  ticketId: string,
  data: {
    name: string;
    url: string;
    size: number;
    type: string;
    base64Data?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  let finalUrl = data.url;

  if (data.base64Data) {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const cleanName = data.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${filePrefix}-${cleanName}`;
    const fsPath = path.join(uploadDir, uniqueFileName);

    const base64Content = data.base64Data.split(";base64,").pop() || data.base64Data;
    fs.writeFileSync(fsPath, Buffer.from(base64Content, "base64"));
    finalUrl = `/uploads/${uniqueFileName}`;
  }

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      name: data.name,
      url: finalUrl,
      size: data.size,
      type: data.type,
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId,
      userId: session.user.id,
      type: "attachment_added",
      newValue: data.name
    }
  });

  revalidatePath("/", "layout");
  return attachment;
}

/** Delete an attachment from a ticket */
export async function deleteAttachment(attachmentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return;

  if (attachment.url.startsWith("/uploads/")) {
    const fileName = attachment.url.replace("/uploads/", "");
    const fsPath = path.join(process.cwd(), "public", "uploads", fileName);
    try {
      if (fs.existsSync(fsPath)) {
        fs.unlinkSync(fsPath);
      }
    } catch (err) {
      console.error("Failed to delete physical file:", err);
    }
  }

  await prisma.attachment.delete({
    where: { id: attachmentId },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: attachment.ticketId,
      userId: session.user.id,
      type: "attachment_removed",
      oldValue: attachment.name
    }
  });

  revalidatePath("/", "layout");
}

/** Search tickets and projects within a workspace or globally */
export async function searchWorkspaceEntities(query: string, workspaceId?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { tickets: [], projects: [] };

  // Determine workspace constraints
  const workspaceFilter: any = workspaceId 
    ? { project: { space: { workspaceId } } }
    : { project: { space: { workspace: { members: { some: { userId: session.user.id } } } } } };

  const projectFilter: any = workspaceId
    ? { space: { workspaceId } }
    : { space: { workspace: { members: { some: { userId: session.user.id } } } } };

  const [tickets, projects] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        AND: [
          workspaceFilter,
          {
            OR: [
              { title: { contains: normalizedQuery, mode: "insensitive" } },
              { ticketId: { contains: normalizedQuery, mode: "insensitive" } },
              { description: { contains: normalizedQuery, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        ticketId: true,
        title: true,
        project: {
          select: {
            id: true,
            space: {
              select: {
                id: true,
                workspaceId: true,
              }
            }
          }
        }
      },
      take: 5,
    }),
    prisma.project.findMany({
      where: {
        AND: [
          projectFilter,
          { name: { contains: normalizedQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        ticketPrefix: true,
        space: {
          select: {
            id: true,
            workspaceId: true,
          }
        }
      },
      take: 5,
    })
  ]);

  return { tickets, projects };
}

/** Add a relation between two tickets */
export async function addTicketRelation(data: {
  sourceTicketId: string;
  targetTicketId: string;
  type: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (data.sourceTicketId === data.targetTicketId) {
    throw new Error("Cannot relate a ticket to itself.");
  }

  const relation = await prisma.ticketRelation.create({
    data: {
      sourceTicketId: data.sourceTicketId,
      targetTicketId: data.targetTicketId,
      type: data.type,
    },
    include: {
      sourceTicket: { select: { ticketId: true, title: true } },
      targetTicket: { select: { ticketId: true, title: true } },
    }
  });

  // Create an activity entry on the source ticket
  await prisma.ticketActivity.create({
    data: {
      ticketId: data.sourceTicketId,
      userId: session.user.id,
      type: "relation_added",
      newValue: `${data.type} ${relation.targetTicket.ticketId}`,
    }
  });

  // Revalidate paths
  revalidatePath("/", "layout");
  return relation;
}

/** Remove a relation between two tickets */
export async function removeTicketRelation(relationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const relation = await prisma.ticketRelation.delete({
    where: { id: relationId },
    include: {
      sourceTicket: { select: { ticketId: true } },
      targetTicket: { select: { ticketId: true } },
    }
  });

  // Create an activity entry on the source ticket
  await prisma.ticketActivity.create({
    data: {
      ticketId: relation.sourceTicketId,
      userId: session.user.id,
      type: "relation_removed",
      oldValue: `${relation.type} ${relation.targetTicket.ticketId}`,
    }
  });

  revalidatePath("/", "layout");
  return relation;
}

/** Get all tickets of a project */
export async function getProjectTickets(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.ticket.findMany({
    where: { projectId },
    select: {
      id: true,
      ticketId: true,
      title: true,
    },
    orderBy: { ticketId: "asc" }
  });
}
