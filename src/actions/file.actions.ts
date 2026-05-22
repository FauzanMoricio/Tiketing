"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

// Ensure uploads directory exists in public/uploads
const getUploadDir = () => {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/** Get all folders and files for a project */
export async function getProjectFilesAndFolders(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectFile.findMany({
      where: { projectId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { folders, files };
}

/** Create a new folder */
export async function createFolder(projectId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const folder = await prisma.folder.create({
    data: {
      projectId,
      name,
    },
  });

  revalidatePath("/", "layout");
  return folder;
}

/** Delete a folder */
export async function deleteFolder(folderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.folder.delete({
    where: { id: folderId },
  });

  revalidatePath("/", "layout");
}

/** Upload a project file (persists database metadata and saves it locally in public/uploads) */
export async function uploadProjectFile(data: {
  projectId: string;
  folderId?: string | null;
  name: string;
  size: number;
  type: string;
  base64Data?: string; // Optional raw base64 string
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const uploadDir = getUploadDir();
  const filePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const cleanName = data.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${filePrefix}-${cleanName}`;
  const fsPath = path.join(uploadDir, uniqueFileName);

  if (data.base64Data) {
    const base64Content = data.base64Data.split(";base64,").pop() || data.base64Data;
    fs.writeFileSync(fsPath, Buffer.from(base64Content, "base64"));
  } else {
    // Write mock content if no base64 was supplied
    fs.writeFileSync(fsPath, Buffer.from(`Mock file content for ${data.name}`));
  }

  const fileUrl = `/uploads/${uniqueFileName}`;

  const fileRecord = await prisma.projectFile.create({
    data: {
      projectId: data.projectId,
      folderId: data.folderId || null,
      name: data.name,
      size: data.size,
      type: data.type,
      url: fileUrl,
      uploadedById: session.user.id,
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  revalidatePath("/", "layout");
  return fileRecord;
}

/** Delete a project file */
export async function deleteProjectFile(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Find file path to delete from disk
  const fileRecord = await prisma.projectFile.findUnique({
    where: { id: fileId },
  });

  if (fileRecord) {
    // If it is in /uploads, try deleting it from filesystem
    if (fileRecord.url.startsWith("/uploads/")) {
      const fileName = fileRecord.url.replace("/uploads/", "");
      const fsPath = path.join(process.cwd(), "public", "uploads", fileName);
      try {
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      } catch (err) {
        console.error("Failed to delete physical file:", err);
      }
    }

    await prisma.projectFile.delete({
      where: { id: fileId },
    });
  }

  revalidatePath("/", "layout");
}
