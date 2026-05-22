// ============================================================
// TypeScript Type Definitions
// ============================================================

export interface WorkspaceMemberWithUser {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  };
}

/** Workspace with nested spaces */
export interface WorkspaceWithSpaces {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  spaces: SpaceWithProjects[];
  members?: WorkspaceMemberWithUser[];
}

/** Space with nested projects */
export interface SpaceWithProjects {
  id: string;
  workspaceId: string;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  projects: ProjectSummary[];
}

/** Project summary (used in sidebar lists) */
export interface ProjectSummary {
  id: string;
  spaceId: string;
  name: string;
  description: string | null;
  ticketPrefix: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Project with full board data (statuses + tickets) */
export interface ProjectWithBoard {
  id: string;
  spaceId: string;
  name: string;
  description: string | null;
  ticketPrefix: string;
  createdAt: Date;
  updatedAt: Date;
  space: {
    id: string;
    name: string;
    workspaceId: string;
    workspace: {
      id: string;
      name: string;
    };
  };
  statuses: StatusWithTickets[];
}

/** Status column with tickets */
export interface StatusWithTickets {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  tickets: TicketData[];
}

/** Ticket data */
export interface TicketData {
  id: string;
  ticketId: string;
  projectId: string;
  statusId: string;
  title: string;
  description: string | null;
  priority: string;
  assigneeId: string | null;
  assignee?: { id: string; name: string; image: string | null } | null;
  comments?: { id: string }[];
  dueDate: Date | null;
  position: number;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Dashboard statistics */
export interface DashboardStats {
  totalWorkspaces: number;
  totalSpaces: number;
  totalProjects: number;
  totalTickets: number;
  ticketsByPriority: Record<string, number>;
  recentTickets: (Omit<TicketData, 'assignee' | 'comments'> & { 
    status: { name: string, color: string },
    project: { name: string, ticketPrefix: string }
  })[];
}
