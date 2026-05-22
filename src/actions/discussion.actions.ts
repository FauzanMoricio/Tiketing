"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/** Create a new discussion thread */
export async function createDiscussion(data: {
  projectId: string;
  title: string;
  content: string;
  category: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const discussion = await prisma.discussion.create({
    data: {
      projectId: data.projectId,
      authorId: session.user.id,
      title: data.title,
      content: data.content,
      category: data.category,
    },
  });

  revalidatePath("/", "layout");
  return discussion;
}

/** Update discussion content or toggle pins */
export async function updateDiscussion(
  id: string,
  data: {
    title?: string;
    content?: string;
    category?: string;
    isPinned?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const discussion = await prisma.discussion.update({
    where: { id },
    data,
  });

  revalidatePath("/", "layout");
  return discussion;
}

/** Delete a discussion thread */
export async function deleteDiscussion(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.discussion.delete({
    where: { id },
  });

  revalidatePath("/", "layout");
}

/** Toggle pin status of a discussion */
export async function togglePinDiscussion(id: string, isPinned: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const discussion = await prisma.discussion.update({
    where: { id },
    data: { isPinned },
  });

  revalidatePath("/", "layout");
  return discussion;
}

/** Fetch discussions with search and category filters */
export async function getProjectDiscussions(
  projectId: string,
  options?: {
    category?: string;
    search?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const whereClause: any = {
    projectId,
  };

  if (options?.category && options.category !== "All") {
    whereClause.category = options.category;
  }

  if (options?.search && options.search.trim()) {
    whereClause.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { content: { contains: options.search, mode: "insensitive" } },
    ];
  }

  return prisma.discussion.findMany({
    where: whereClause,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" },
    ],
  });
}

/** Create a reply to a discussion thread */
export async function createDiscussionReply(data: {
  discussionId: string;
  content: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const reply = await prisma.discussionReply.create({
    data: {
      discussionId: data.discussionId,
      authorId: session.user.id,
      content: data.content,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  revalidatePath("/", "layout");
  return reply;
}

/** Delete a reply */
export async function deleteDiscussionReply(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.discussionReply.delete({
    where: { id },
  });

  revalidatePath("/", "layout");
}

/** Get a single discussion with all replies */
export async function getDiscussionWithReplies(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.discussion.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      replies: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}
