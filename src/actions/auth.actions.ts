"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateVerificationToken, generateTwoFactorToken, generatePasswordResetToken } from "@/lib/tokens";
import { sendVerificationEmail, sendTwoFactorTokenEmail, sendPasswordResetEmail } from "@/lib/mail";

const RegisterSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser || !existingUser.password) {
      return "Invalid credentials.";
    }

    const passwordsMatch = await bcrypt.compare(password, existingUser.password);
    if (!passwordsMatch) {
      return "Invalid credentials.";
    }

    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

import { generateShortId } from "@/lib/utils";

export async function register(prevState: string | undefined, formData: FormData) {
  try {
    const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData));
    
    if (!validatedFields.success) {
      return "Invalid form data.";
    }

    const { name, email, password } = validatedFields.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return "User with this email already exists.";
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: new Date(), // Automatically verify account for immediate access
      },
    });

    let uniqueId = generateShortId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.workspace.findUnique({ where: { id: uniqueId } });
      if (!existing) break;
      uniqueId = generateShortId();
      attempts++;
    }

    await prisma.workspace.create({
      data: {
        id: uniqueId,
        name: `${name}'s Workspace`,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });

    return "success";
  } catch (error) {
    return "Failed to register. Please try again.";
  }
}

export async function resetPassword(email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    return { error: "Email not found." };
  }

  const passwordResetToken = await generatePasswordResetToken(email);
  await sendPasswordResetEmail(passwordResetToken.email, passwordResetToken.token);

  return { success: "Reset email sent!" };
}

export async function newPassword(password: string, token: string) {
  const existingToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!existingToken) {
    return { error: "Invalid token." };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) {
    return { error: "Token has expired." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: existingToken.email },
  });

  if (!existingUser) {
    return { error: "User does not exist." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: existingUser.id },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({
    where: { id: existingToken.id },
  });

  return { success: "Password updated!" };
}

export async function newVerification(token: string) {
  const existingToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!existingToken) {
    return { error: "Token does not exist." };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) {
    return { error: "Token has expired." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: existingToken.email },
  });

  if (!existingUser) {
    return { error: "Email does not exist." };
  }

  await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      emailVerified: new Date(),
      email: existingToken.email, // Handle email change
    },
  });

  await prisma.verificationToken.delete({
    where: { id: existingToken.id },
  });

  return { success: "Email verified!" };
}

export async function logout() {
  await signOut();
}
