"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/** Create a new milestone */
export async function createMilestone(data: {
  projectId: string;
  title: string;
  description?: string;
  dueDate: Date;
  status?: string;
  ticketIds?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await prisma.milestone.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      status: data.status || "ACTIVE",
    },
  });

  // Link tickets if provided
  if (data.ticketIds && data.ticketIds.length > 0) {
    await prisma.ticket.updateMany({
      where: {
        id: { in: data.ticketIds },
      },
      data: {
        milestoneId: milestone.id,
      },
    });
  }

  revalidatePath("/", "layout");
  return milestone;
}

/** Update an existing milestone */
export async function updateMilestone(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    dueDate?: Date;
    status?: string;
    ticketIds?: string[];
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await prisma.milestone.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      status: data.status,
    },
  });

  // If ticketIds are modified
  if (data.ticketIds !== undefined) {
    // Unlink old tickets
    await prisma.ticket.updateMany({
      where: { milestoneId: id },
      data: { milestoneId: null },
    });

    // Link new tickets
    if (data.ticketIds.length > 0) {
      await prisma.ticket.updateMany({
        where: { id: { in: data.ticketIds } },
        data: { milestoneId: id },
      });
    }
  }

  revalidatePath("/", "layout");
  return milestone;
}

/** Delete a milestone */
export async function deleteMilestone(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.milestone.delete({
    where: { id },
  });

  revalidatePath("/", "layout");
}

/** Get all milestones for a project with tickets included */
export async function getProjectMilestones(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.milestone.findMany({
    where: { projectId },
    include: {
      tickets: {
        select: {
          id: true,
          ticketId: true,
          title: true,
          status: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}
