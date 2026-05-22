"use server";

// ============================================================
// Space Server Actions
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { generateShortId } from "@/lib/utils";

/** Create a new space within a workspace */
export async function createSpace(data: {
  workspaceId: string;
  name: string;
  icon?: string;
  color?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify access
  const ws = await prisma.workspace.findUnique({
    where: { id: data.workspaceId, members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } }
  });
  if (!ws) throw new Error("Unauthorized");

  let uniqueId = generateShortId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.space.findUnique({ where: { id: uniqueId } });
    if (!existing) break;
    uniqueId = generateShortId();
    attempts++;
  }

  const space = await prisma.space.create({ 
    data: {
      id: uniqueId,
      workspaceId: data.workspaceId,
      name: data.name,
      icon: data.icon,
      color: data.color
    } 
  });
  revalidatePath("/", "layout");
  return space;
}

/** Update a space */
export async function updateSpace(
  id: string,
  data: { name?: string; icon?: string; color?: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const space = await prisma.space.update({
    where: { 
      id, 
      workspace: { members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } } 
    },
    data,
  });
  revalidatePath("/", "layout");
  return space;
}

/** Delete a space (cascades to projects, statuses, tickets) */
export async function deleteSpace(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.space.delete({ 
    where: { 
      id,
      workspace: { members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } }
    } 
  });
  revalidatePath("/", "layout");
}
