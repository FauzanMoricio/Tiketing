"use server";

// ============================================================
// Workspace Server Actions
// ============================================================

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";

import { generateShortId } from "@/lib/utils";

/** Get all workspaces for current user */
export async function getWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Get a workspace with all nested spaces and projects */
export async function getWorkspaceWithSpaces(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.workspace.findFirst({
    where: { 
      id: workspaceId,
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
  });
}

/** Create a new workspace */
export async function createWorkspace(data: { name: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  let uniqueId = generateShortId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.workspace.findUnique({ where: { id: uniqueId } });
    if (!existing) break;
    uniqueId = generateShortId();
    attempts++;
  }

  const workspace = await prisma.workspace.create({ 
    data: {
      id: uniqueId,
      name: data.name,
      members: {
        create: {
          userId: session.user.id,
          role: "owner"
        }
      }
    } 
  });
  revalidatePath("/", "layout");
  return workspace;
}

/** Update a workspace */
export async function updateWorkspace(
  id: string,
  data: { name: string }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const workspace = await prisma.workspace.update({
    where: { id, members: { some: { userId: session.user.id, role: { in: ["owner", "admin"] } } } },
    data,
  });
  revalidatePath("/", "layout");
  return workspace;
}

/** Delete a workspace (cascades to all children) */
export async function deleteWorkspace(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.workspace.delete({ 
    where: { id, members: { some: { userId: session.user.id, role: "owner" } } } 
  });
  revalidatePath("/", "layout");
}

/** Get all members in a workspace */
export async function getWorkspaceMembers(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify the requester is a member of the workspace
  const isMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id }
  });

  if (!isMember) throw new Error("Unauthorized");

  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

/** Invite a new member to a workspace (adds directly by email for mock/simplicity) */
export async function inviteWorkspaceMember(workspaceId: string, email: string, role: string = "member") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify requester is owner or admin in this workspace
  const requesterMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.user.id
      }
    }
  });

  if (!requesterMember || !["owner", "admin"].includes(requesterMember.role)) {
    throw new Error("Only owners and admins can invite members.");
  }

  // Find user to invite
  const targetUser = await prisma.user.findUnique({
    where: { email }
  });

  if (!targetUser) {
    throw new Error(`User with email "${email}" not found.`);
  }

  // Check if already a member
  const existingMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUser.id
      }
    }
  });

  if (existingMember) {
    throw new Error("User is already a member of this workspace.");
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: targetUser.id,
      role
    }
  });

  revalidatePath("/", "layout");
  return member;
}

/** Update workspace member role */
export async function updateWorkspaceMemberRole(workspaceId: string, memberId: string, role: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify requester is owner or admin
  const requesterMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.user.id
      }
    }
  });

  if (!requesterMember || !["owner", "admin"].includes(requesterMember.role)) {
    throw new Error("Only owners and admins can modify member roles.");
  }

  // Find target member
  const targetMember = await prisma.workspaceMember.findUnique({
    where: { id: memberId }
  });

  if (!targetMember) throw new Error("Member not found.");

  // Prevent modifying the owner
  if (targetMember.role === "owner" && requesterMember.role !== "owner") {
    throw new Error("Cannot modify the owner's role.");
  }

  // Update role
  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role }
  });

  revalidatePath(`/settings`);
  return updated;
}

/** Remove workspace member */
export async function removeWorkspaceMember(workspaceId: string, memberId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify requester is owner or admin
  const requesterMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.user.id
      }
    }
  });

  if (!requesterMember || !["owner", "admin"].includes(requesterMember.role)) {
    throw new Error("Only owners and admins can remove members.");
  }

  // Find target member
  const targetMember = await prisma.workspaceMember.findUnique({
    where: { id: memberId }
  });

  if (!targetMember) throw new Error("Member not found.");

  // Prevent removing the owner
  if (targetMember.role === "owner") {
    throw new Error("Cannot remove the owner of the workspace.");
  }

  // Prevent non-owners from removing admins
  if (targetMember.role === "admin" && requesterMember.role !== "owner") {
    throw new Error("Only the owner can remove admins.");
  }

  await prisma.workspaceMember.delete({
    where: { id: memberId }
  });

  revalidatePath("/", "layout");
}
