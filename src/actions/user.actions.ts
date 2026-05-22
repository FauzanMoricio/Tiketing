"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      hasPassword: !!user.password,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function updateProfile(
  prevState: any,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const image = formData.get("image") as string;
  const email = formData.get("email") as string;

  try {
    if (!name || name.trim().length < 2) {
      return { error: "Name must be at least 2 characters." };
    }

    if (!email || !email.includes("@")) {
      return { error: "Please enter a valid email address." };
    }

    // Check if email is already in use by another user
    if (email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return { error: "Email is already in use." };
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        image: image.trim() || null,
        email: email.trim(),
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return { success: "Profile updated successfully!" };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile. Please try again." };
  }
}

export async function updatePassword(
  prevState: any,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || newPassword.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: "User not found." };
    }

    // If the user registered via Credentials (has a password), we must verify current password first
    if (user.password) {
      if (!currentPassword) {
        return { error: "Current password is required." };
      }
      const passwordsMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordsMatch) {
        return { error: "Current password is incorrect." };
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
      },
    });

    return { success: "Password updated successfully!" };
  } catch (error) {
    console.error("Error updating password:", error);
    return { error: "Failed to update password. Please try again." };
  }
}
