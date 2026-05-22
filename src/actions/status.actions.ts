"use server";

// ============================================================
// Status Server Actions
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";

/** Create a new status column in a project */
export async function createStatus(data: {
  projectId: string;
  name: string;
  color: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Get the highest position to append at end
  const maxPosition = await prisma.status.aggregate({
    where: { projectId: data.projectId },
    _max: { position: true },
  });

  const position = (maxPosition._max.position ?? -1) + 1;

  const status = await prisma.status.create({
    data: { ...data, position },
    include: { tickets: true },
  });

  revalidatePath("/", "layout");
  return status;
}

/** Update a status column */
export async function updateStatus(
  id: string,
  data: { name?: string; color?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const status = await prisma.status.update({
    where: { id, project: { space: { workspace: { members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } } } } },
    data,
  });
  revalidatePath("/", "layout");
  return status;
}

/** Delete a status column (tickets in this status will be deleted) */
export async function deleteStatus(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.status.delete({ 
    where: { id, project: { space: { workspace: { members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } } } } } 
  });
  revalidatePath("/", "layout");
}

/** Reorder status columns within a project */
export async function reorderStatuses(
  projectId: string,
  orderedIds: string[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const updates = orderedIds.map((id, index) =>
    prisma.status.update({
      where: { id },
      data: { position: index },
    })
  );

  await prisma.$transaction(updates);
  revalidatePath("/", "layout");
}
