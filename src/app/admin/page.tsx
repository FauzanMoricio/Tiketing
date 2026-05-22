import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAdminStats, getAllUsers } from "@/actions/admin.actions";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Query database to ensure role is admin
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  if (!dbUser || dbUser.role !== "admin") {
    redirect("/");
  }

  const stats = await getAdminStats();
  const users = await getAllUsers();

  return (
    <AdminDashboardClient 
      initialStats={stats} 
      initialUsers={users} 
      currentUserId={session.user.id} 
    />
  );
}
