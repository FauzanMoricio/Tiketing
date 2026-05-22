// ============================================================
// Database Seeder — Enterprise Tiket
// ============================================================
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STATUS_COLORS = [
  "#94a3b8", // Backlog
  "#3b82f6", // To Do
  "#eab308", // In Progress
  "#a855f7", // Review
  "#22c55e", // Done
];

async function main() {
  console.log("🌱 Seeding database...");

  // Cleanup existing data to make the seed script re-runnable
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { notIn: ["moris@tiket.dev", "fauzan@tiket.dev"] } }
  });

  // 1. Create Default Users
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user1 = await prisma.user.upsert({
    where: { email: "moris@tiket.dev" },
    update: {
      role: "admin"
    },
    create: {
      name: "Moris",
      email: "moris@tiket.dev",
      password: hashedPassword,
      role: "admin",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "fauzan@tiket.dev" },
    update: {},
    create: {
      name: "Fauzan",
      email: "fauzan@tiket.dev",
      password: hashedPassword,
    },
  });

  console.log("✅ Created Users: Moris, Fauzan");

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      id: "moris",
      name: "Moris Workspace",
      members: {
        create: [
          { userId: user1.id, role: "owner" },
          { userId: user2.id, role: "admin" },
        ],
      },
      spaces: {
        create: [
          {
            id: "dev01",
            name: "Development",
            icon: "Code",
            color: "#3b82f6",
          },
          {
            id: "mkt01",
            name: "Marketing",
            icon: "Megaphone",
            color: "#eab308",
          },
        ],
      },
    },
    include: {
      spaces: true,
    },
  });

  console.log(`` + `✅ Created Workspace: ${workspace.name}`);

  const devSpace = workspace.spaces.find((s) => s.name === "Development")!;

  // 3. Create Project with Prefix and Counter
  const project = await prisma.project.create({
    data: {
      id: "web01",
      spaceId: devSpace.id,
      name: "Website Revamp",
      description: "Overhaul of the main corporate website",
      ticketPrefix: "WEB",
      ticketCounter: 0,
      members: {
        create: [
          { userId: user1.id, role: "owner" },
          { userId: user2.id, role: "admin" },
        ],
      },
      statuses: {
        create: [
          { name: "Backlog", color: STATUS_COLORS[0], position: 0 },
          { name: "To Do", color: STATUS_COLORS[1], position: 1 },
          { name: "In Progress", color: STATUS_COLORS[2], position: 2 },
          { name: "Review", color: STATUS_COLORS[3], position: 3 },
          { name: "Done", color: STATUS_COLORS[4], position: 4 },
        ],
      },
    },
    include: {
      statuses: true,
    },
  });

  console.log(`` + `✅ Created Project: ${project.name} (Prefix: ${project.ticketPrefix})`);

  // 4. Create Sample Tickets using transaction to simulate real flow
  const statuses = project.statuses.sort((a, b) => a.position - b.position);

  const sampleTickets = [
    { title: "Design new landing page", statusIdx: 4, prio: "high", assignee: user1.id },
    { title: "Implement Auth.js", statusIdx: 2, prio: "urgent", assignee: user2.id },
    { title: "Setup PostgreSQL database", statusIdx: 4, prio: "high", assignee: user2.id },
    { title: "Write API documentation", statusIdx: 1, prio: "medium", assignee: user1.id },
    { title: "Fix layout on mobile", statusIdx: 0, prio: "low", assignee: null },
  ];

  for (const t of sampleTickets) {
    // Simulate generation transaction
    await prisma.$transaction(async (tx) => {
      const p = await tx.project.findUnique({ where: { id: project.id } });
      if (!p) return;
      
      const newCounter = p.ticketCounter + 1;
      const ticketId = `${p.ticketPrefix}-${newCounter.toString().padStart(3, "0")}`; // e.g., WEB-001

      await tx.project.update({
        where: { id: project.id },
        data: { ticketCounter: newCounter },
      });

      const ticket = await tx.ticket.create({
        data: {
          ticketId,
          projectId: project.id,
          statusId: statuses[t.statusIdx].id,
          title: t.title,
          priority: t.prio,
          assigneeId: t.assignee,
          createdById: user1.id,
          position: 0,
        },
      });

      // Add a comment to the first ticket
      if (newCounter === 1) {
        await tx.comment.create({
          data: {
            ticketId: ticket.id,
            userId: user1.id,
            content: "We should prioritize the hero section first.",
          },
        });
      }

      // Add activity log
      await tx.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          userId: user1.id,
          type: "ticket_created",
        },
      });
    });
  }

  console.log(`✅ Created 5 sample tickets with readable IDs (WEB-001 to WEB-005)`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
