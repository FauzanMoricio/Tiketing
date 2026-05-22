"use server";

// ============================================================
// Project Server Actions
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DEFAULT_STATUSES } from "@/lib/constants";

import { auth } from "@/auth";

import { generateShortId } from "@/lib/utils";

function generatePrefix(name: string): string {
  const words = name.split(" ");
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    return (words[0].substring(0, 2) + words[1][0]).toUpperCase();
  } else {
    return name.substring(0, 3).toUpperCase();
  }
}

/** Create a new project with default status columns */
export async function createProject(data: {
  spaceId: string;
  name: string;
  description?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ticketPrefix = generatePrefix(data.name);

  let uniqueId = generateShortId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.project.findUnique({ where: { id: uniqueId } });
    if (!existing) break;
    uniqueId = generateShortId();
    attempts++;
  }

  const project = await prisma.project.create({
    data: {
      id: uniqueId,
      spaceId: data.spaceId,
      name: data.name,
      description: data.description,
      ticketPrefix,
      statuses: {
        create: DEFAULT_STATUSES,
      },
      members: {
        create: {
          userId: session.user.id,
          role: "owner"
        }
      }
    },
    include: {
      statuses: true,
    },
  });

  revalidatePath("/", "layout");
  return project;
}

/** Get a project with full board data (statuses + tickets) */
export async function getProjectWithBoard(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.project.findFirst({
    where: { 
      id: projectId,
      space: { workspace: { members: { some: { userId: session.user.id } } } }
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        }
      },
      space: {
        include: {
          workspace: {
            include: {
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
          },
        },
      },
      statuses: {
        orderBy: { position: "asc" },
        include: {
          tickets: {
            orderBy: { position: "asc" },
            include: {
              assignee: { select: { id: true, name: true, image: true } },
              comments: { select: { id: true } }
            }
          },
        },
      },
    },
  });
}

/** Update a project */
export async function updateProject(
  id: string,
  data: { name?: string; description?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.update({
    where: { id, space: { workspace: { members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } } } },
    data,
  });
  revalidatePath("/", "layout");
  return project;
}

/** Delete a project (cascades to statuses and tickets) */
export async function deleteProject(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.project.delete({ 
    where: { id, space: { workspace: { members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } } } } 
  });
  revalidatePath("/", "layout");
}
