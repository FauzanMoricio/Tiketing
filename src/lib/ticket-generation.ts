import { prisma } from "@/lib/prisma";

export async function generateTicketIdAndCreateTicket(data: {
  projectId: string;
  statusId: string;
  title: string;
  description?: string;
  priority: string;
  assigneeId?: string;
  createdById: string;
  labels?: string[];
  dueDate?: Date;
  position: number;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock the project row for update to prevent race conditions
    // Prisma does not have native SELECT ... FOR UPDATE, so we use a raw query
    const projects: any[] = await tx.$queryRaw`
      SELECT id, ticket_prefix as "ticketPrefix", ticket_counter as "ticketCounter" 
      FROM projects 
      WHERE id = ${data.projectId} 
      FOR UPDATE
    `;

    if (projects.length === 0) {
      throw new Error("Project not found");
    }

    const project = projects[0];

    // 2. Increment counter safely
    const newCounter = project.ticketCounter + 1;
    const ticketId = `${project.ticketPrefix}-${newCounter.toString().padStart(3, "0")}`; // e.g., WEB-015

    // 3. Update the counter in DB
    await tx.project.update({
      where: { id: data.projectId },
      data: { ticketCounter: newCounter },
    });

    // 4. Save ticket
    const ticket = await tx.ticket.create({
      data: {
        ticketId,
        projectId: data.projectId,
        statusId: data.statusId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeId: data.assigneeId,
        createdById: data.createdById,
        position: data.position,
        labels: data.labels || [],
        dueDate: data.dueDate,
      },
    });

    // 5. Add creation activity log
    await tx.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        userId: data.createdById,
        type: "ticket_created",
      },
    });

    return ticket;
  });
}
