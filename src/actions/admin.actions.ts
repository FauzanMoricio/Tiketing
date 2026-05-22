"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// Ensure the caller is an admin
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}

export async function getAdminStats() {
  await requireAdmin();
  
  const [totalUsers, totalWorkspaces, totalTickets] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.ticket.count()
  ]);
  
  return { totalUsers, totalWorkspaces, totalTickets };
}

export async function getAllUsers() {
  await requireAdmin();
  
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    }
  });
}

import { generateShortId } from "@/lib/utils";

export async function createAccountByAdmin(data: {
  name: string;
  email: string;
  password?: string;
  role?: string;
}) {
  await requireAdmin();
  
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });
  
  if (existingUser) {
    throw new Error("User with this email already exists");
  }
  
  const pwd = data.password || "Password123";
  const hashedPassword = await bcrypt.hash(pwd, 10);
  
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || "user",
      emailVerified: new Date(),
    }
  });
  
  let uniqueId = generateShortId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.workspace.findUnique({ where: { id: uniqueId } });
    if (!existing) break;
    uniqueId = generateShortId();
    attempts++;
  }

  // Create a default workspace for this user
  await prisma.workspace.create({
    data: {
      id: uniqueId,
      name: `${data.name}'s Workspace`,
      members: {
        create: {
          userId: user.id,
          role: "owner"
        }
      }
    }
  });
  
  revalidatePath("/admin");
  return { success: true, userId: user.id };
}

export async function updateUserRoleByAdmin(userId: string, newRole: string) {
  const currentAdmin = await requireAdmin();
  if (userId === currentAdmin.id) {
    throw new Error("Cannot change your own role");
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });
  
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteUserByAdmin(userId: string) {
  const currentAdmin = await requireAdmin();
  if (userId === currentAdmin.id) {
    throw new Error("Cannot delete your own account");
  }
  
  await prisma.user.delete({
    where: { id: userId }
  });
  
  revalidatePath("/admin");
  return { success: true };
}
