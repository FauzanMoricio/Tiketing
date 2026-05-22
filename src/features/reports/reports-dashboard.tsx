"use client";

import { useState } from "react";
import { 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle, 
  TrendingUp, 
  Users, 
  Activity, 
  Calendar,
  ChevronRight,
  Clock,
  ArrowRight,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Status {
  id: string;
  name: string;
  color: string;
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
}

interface Ticket {
  id: string;
  ticketId: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: Status;
  assignee: User | null;
}

interface TicketActivity {
  id: string;
  type: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: User;
  ticket: {
    id: string;
    ticketId: string;
    title: string;
  };
}

interface ReportsDashboardProps {
  tickets: Ticket[];
  activities: TicketActivity[];
  workspaceMembers: { user: User }[];
  isViewer: boolean;
}

export function ReportsDashboard({
  tickets,
  activities,
  workspaceMembers,
  isViewer,
}: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "completed" | "overdue" | "workload">("dashboard");
  const [now] = useState(() => Date.now());

  // Helper: Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper: Format relative time
  const formatRelativeTime = (date: Date) => {
    const diff = now - new Date(date).getTime();
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  };

  // 1. Metric Calculations
  const totalCount = tickets.length;
  
  const completedTickets = tickets.filter(t => 
    t.status.name.toLowerCase() === "done" || 
    t.status.name.toLowerCase() === "completed"
  );
  const doneCount = completedTickets.length;

  const inProgressTickets = tickets.filter(t => 
    t.status.name.toLowerCase() === "in progress" || 
    t.status.name.toLowerCase() === "active" ||
    t.status.name.toLowerCase() === "review"
  );
  const activeCount = inProgressTickets.length;

  const todoTickets = tickets.filter(t => 
    t.status.name.toLowerCase() === "todo" || 
    t.status.name.toLowerCase() === "backlog"
  );
  const todoCount = todoTickets.length;

  // Overdue = Not done, has due date, and due date < today
  const today = new Date();
  const overdueTickets = tickets.filter(t => {
    const isDone = t.status.name.toLowerCase() === "done" || t.status.name.toLowerCase() === "completed";
    return !isDone && t.dueDate && new Date(t.dueDate) < today;
  });
  const overdueCount = overdueTickets.length;

  const donePercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  const todoPercent = totalCount > 0 ? Math.round((todoCount / totalCount) * 100) : 0;
  const overduePercent = totalCount > 0 ? Math.round((overdueCount / totalCount) * 100) : 0;

  // 2. Chart Data Generation: Productivity (Completions per day over last 7 days)
  const getProductivityData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const keyStr = d.toDateString();
      
      const count = completedTickets.filter(t => 
        new Date(t.updatedAt).toDateString() === keyStr
      ).length;

      data.push({ label, count });
    }
    return data;
  };
  const productivityData = getProductivityData();
  const maxProductivityCount = Math.max(...productivityData.map(d => d.count), 4);

  // 3. Chart Data Generation: Burn Down (Remaining open tasks over last 7 days)
  const getBurnDownData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const dayEndTimestamp = d.getTime();

      // Ideal Remaining (Linear decrease from totalCount to 0)
      const idealFraction = i / 6; // starts at 1, goes to 0
      const ideal = Math.round(totalCount * idealFraction);

      // Actual Remaining (Tickets created before/on this day, and NOT completed on or before this day)
      const actualRemaining = tickets.filter(t => {
        const createdOnOrBefore = new Date(t.createdAt).getTime() <= dayEndTimestamp;
        const isDone = t.status.name.toLowerCase() === "done" || t.status.name.toLowerCase() === "completed";
        const completedAfterDay = isDone && new Date(t.updatedAt).getTime() > dayEndTimestamp;
        
        return createdOnOrBefore && (!isDone || completedAfterDay);
      }).length;

      data.push({ label, ideal, actual: actualRemaining });
    }
    return data;
  };
  const burnDownData = getBurnDownData();
  const maxBurnDownValue = Math.max(...burnDownData.map(d => Math.max(d.ideal, d.actual)), 5);

  // 4. Team Workload Calculations
  const getTeamWorkload = () => {
    return workspaceMembers.map(m => {
      const memberTickets = tickets.filter(t => t.assignee?.id === m.user.id);
      const total = memberTickets.length;
      const done = memberTickets.filter(t => 
        t.status.name.toLowerCase() === "done" || 
        t.status.name.toLowerCase() === "completed"
      ).length;
      const open = total - done;

      return {
        user: m.user,
        total,
        done,
        open,
      };
    }).sort((a, b) => b.total - a.total);
  };
  const teamWorkload = getTeamWorkload();
  const maxMemberTasks = Math.max(...teamWorkload.map(t => t.total), 1);

  // 5. Activity Formatting
  const renderActivityDescription = (act: TicketActivity) => {
    const userName = <span className="font-bold text-foreground">{act.user.name || "A user"}</span>;
    const ticketLink = (
      <span className="font-bold text-primary hover:underline cursor-pointer">
        {act.ticket.ticketId}: {act.ticket.title}
      </span>
    );

    if (act.type === "status_change") {
      return (
        <span className="text-xs text-muted-foreground leading-normal">
          {userName} moved {ticketLink} from <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">{act.oldValue}</span> to <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{act.newValue}</span>
        </span>
      );
    }
    if (act.type === "priority_change") {
      return (
        <span className="text-xs text-muted-foreground leading-normal">
          {userName} updated priority of {ticketLink} to <span className="text-foreground font-bold capitalize">{act.newValue}</span>
        </span>
      );
    }
    if (act.type === "comment_added") {
      return (
        <span className="text-xs text-muted-foreground leading-normal">
          {userName} commented on {ticketLink}: <span className="italic text-foreground">"{act.newValue}"</span>
        </span>
      );
    }
    if (act.type === "assignee_change") {
      return (
        <span className="text-xs text-muted-foreground leading-normal">
          {userName} assigned {ticketLink} to <span className="text-foreground font-bold">{act.newValue || "Unassigned"}</span>
        </span>
      );
    }

    return (
      <span className="text-xs text-muted-foreground leading-normal">
        {userName} updated {ticketLink}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Sub tabs navigation */}
      <div className="flex border-b border-border/40 pb-0.5 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "dashboard"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Overview Dashboard
          </div>
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "completed"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Completed Tasks ({doneCount})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("overdue")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "overdue"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Overdue Tasks ({overdueCount})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("workload")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "workload"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Team Workload
          </div>
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW DASHBOARD ──────────────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between hover:border-border transition-all">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Scope</span>
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <span className="text-3xl font-extrabold text-foreground">{totalCount}</span>
              <span className="text-[10px] text-muted-foreground">Total project tickets created</span>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between hover:border-border transition-all">
              <div className="flex justify-between items-center text-green-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="text-3xl font-extrabold text-foreground">{doneCount}</span>
              <span className="text-[10px] text-green-500 font-medium">{donePercent}% project completed</span>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between hover:border-border transition-all">
              <div className="flex justify-between items-center text-blue-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Progress</span>
                <PlayCircle className="h-4 w-4" />
              </div>
              <span className="text-3xl font-extrabold text-foreground">{activeCount}</span>
              <span className="text-[10px] text-blue-500 font-medium">{activePercent}% in active dev</span>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between hover:border-border transition-all">
              <div className="flex justify-between items-center text-rose-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Overdue</span>
                <AlertCircle className="h-4 w-4" />
              </div>
              <span className="text-3xl font-extrabold text-rose-500">{overdueCount}</span>
              <span className="text-[10px] text-rose-500 font-medium">{overduePercent}% past due dates</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* SVG Productivity Chart */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-foreground">Completed Tasks (Productivity)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks completed daily over the past 7 days.</p>
              </div>
              
              {/* Dynamic SVG Area Chart */}
              <div className="h-48 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

                  {/* Draw Smooth Path */}
                  {(() => {
                    const points = productivityData.map((d, idx) => {
                      const x = (idx / 6) * 500;
                      const y = 170 - (d.count / maxProductivityCount) * 140;
                      return `${x},${y}`;
                    }).join(" ");

                    const areaPoints = `0,170 ${points} 500,170`;

                    return (
                      <>
                        <polygon points={areaPoints} fill="url(#areaGrad)" />
                        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" />
                      </>
                    );
                  })()}

                  {/* Highlight Dots */}
                  {productivityData.map((d, idx) => {
                    const x = (idx / 6) * 500;
                    const y = 170 - (d.count / maxProductivityCount) * 140;
                    return (
                      <g key={idx} className="group/dot cursor-pointer">
                        <circle cx={x} cy={y} r="5" fill="var(--primary)" stroke="white" strokeWidth="1.5" />
                        <circle cx={x} cy={y} r="10" fill="var(--primary)" opacity="0" className="group-hover/dot:opacity-30 transition-opacity" />
                      </g>
                    );
                  })}
                </svg>

                {/* X-Axis labels */}
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground mt-2 px-1">
                  {productivityData.map((d, idx) => (
                    <span key={idx} className="text-center">{d.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* SVG Burn Down Chart */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-foreground">Burn Down Chart</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Actual remaining open tasks vs ideal timeline pace.</p>
              </div>

              {/* Dynamic SVG Line Chart */}
              <div className="h-48 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

                  {/* Draw Ideal Line (Dashed) */}
                  {(() => {
                    const idealPoints = burnDownData.map((d, idx) => {
                      const x = (idx / 6) * 500;
                      const y = 170 - (d.ideal / maxBurnDownValue) * 140;
                      return `${x},${y}`;
                    }).join(" ");

                    return <polyline points={idealPoints} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="5 5" />;
                  })()}

                  {/* Draw Actual Remaining Line */}
                  {(() => {
                    const actualPoints = burnDownData.map((d, idx) => {
                      const x = (idx / 6) * 500;
                      const y = 170 - (d.actual / maxBurnDownValue) * 140;
                      return `${x},${y}`;
                    }).join(" ");

                    return <polyline points={actualPoints} fill="none" stroke="#6366f1" strokeWidth="3" />;
                  })()}

                  {/* Highlight Actual Dots */}
                  {burnDownData.map((d, idx) => {
                    const x = (idx / 6) * 500;
                    const y = 170 - (d.actual / maxBurnDownValue) * 140;
                    return (
                      <circle key={idx} cx={x} cy={y} r="4" fill="#6366f1" stroke="white" strokeWidth="1.5" />
                    );
                  })}
                </svg>

                {/* Legend Overlay */}
                <div className="absolute top-0 right-0 flex items-center gap-3 text-[10px] font-semibold">
                  <div className="flex items-center gap-1">
                    <span className="h-1 w-4 bg-muted-foreground/50 border-t border-dashed" />
                    <span className="text-muted-foreground">Ideal Burn</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-1 w-4 bg-indigo-500" />
                    <span className="text-indigo-400">Actual Scope</span>
                  </div>
                </div>

                {/* X-Axis labels */}
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground mt-2 px-1">
                  {burnDownData.map((d, idx) => (
                    <span key={idx} className="text-center">{d.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lower Section: Team Progress & Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Short Workload Overview */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-1 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Workload Distribution</h3>
                <p className="text-xs text-muted-foreground">Assigned tasks per project team member.</p>
              </div>

              <div className="space-y-3.5 my-4">
                {teamWorkload.slice(0, 3).map((w, idx) => {
                  const percent = Math.round((w.total / maxMemberTasks) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {w.user.image ? (
                            <img src={w.user.image} alt="" className="h-4.5 w-4.5 rounded-full object-cover" />
                          ) : (
                            <div className="h-4.5 w-4.5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                              {w.user.name?.charAt(0) || "U"}
                            </div>
                          )}
                          <span className="text-foreground truncate">{w.user.name || "Member"}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0">{w.total} tasks ({w.open} open)</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("workload")}
                className="w-full text-xs gap-1.5 rounded-xl h-8 mt-2"
              >
                View Detailed Workload
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Activity Summary Log */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">Project Activity Log</h3>
                  <p className="text-xs text-muted-foreground">Recent changes and progress records.</p>
                </div>
                <Activity className="h-4 w-4 text-muted-foreground/60" />
              </div>

              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Clock className="h-7 w-7 opacity-30 mb-2" />
                  <p className="text-xs font-bold">No recent activities logged</p>
                </div>
              ) : (
                <div className="relative border-l border-border/50 ml-2.5 pl-5.5 py-1 space-y-4 max-h-56 overflow-y-auto">
                  {activities.map((act) => (
                    <div key={act.id} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27.5px] top-1 h-2.5 w-2.5 rounded-full bg-primary/20 border border-primary flex items-center justify-center">
                        <span className="h-1 w-1 bg-primary rounded-full" />
                      </span>

                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5 flex-1">
                          {renderActivityDescription(act)}
                        </div>
                        <span className="text-[10px] text-muted-foreground/75 font-semibold shrink-0">
                          {formatRelativeTime(act.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: COMPLETED TASKS LIST ───────────────────────────────────────────────────────── */}
      {activeTab === "completed" && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Completed Tickets Log</h3>
            <p className="text-xs text-muted-foreground">Historical list of tasks delivered successfully.</p>
          </div>

          {completedTickets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/60 rounded-xl">
              <CheckCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2.5" />
              <p className="text-xs font-bold text-muted-foreground">No completed tickets yet. Move ticket to Done in Board/List!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 border border-border/40 rounded-xl overflow-hidden">
              {completedTickets.map(ticket => (
                <div key={ticket.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/5 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-green-500/10 text-green-500 px-2.5 py-0.5 rounded-full uppercase">
                        {ticket.ticketId}
                      </span>
                      <p className="text-xs font-bold text-foreground truncate">{ticket.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                      <span>Priority: <span className="text-foreground capitalize">{ticket.priority}</span></span>
                      <span>•</span>
                      <span>Assigned to: <span className="text-foreground">{ticket.assignee?.name || "Unassigned"}</span></span>
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground text-right shrink-0">
                    <span className="block font-semibold text-green-500">Completed</span>
                    <span className="block mt-0.5 text-[9px] font-medium">{formatDate(ticket.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: OVERDUE TASKS LIST ─────────────────────────────────────────────────────────── */}
      {activeTab === "overdue" && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Overdue Tickets Log</h3>
            <p className="text-xs text-muted-foreground">Active tasks which have exceeded their set target dates.</p>
          </div>

          {overdueTickets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/60 rounded-xl">
              <CheckCircle className="h-8 w-8 text-green-500/20 mx-auto mb-2.5" />
              <p className="text-xs font-bold text-muted-foreground">All active tasks are pacing within scheduled target dates!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 border border-border/40 rounded-xl overflow-hidden">
              {overdueTickets.map(ticket => (
                <div key={ticket.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-muted/5 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-rose-500/10 text-rose-500 px-2.5 py-0.5 rounded-full uppercase">
                        {ticket.ticketId}
                      </span>
                      <p className="text-xs font-bold text-foreground truncate">{ticket.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                      <span>Priority: <span className="text-foreground capitalize">{ticket.priority}</span></span>
                      <span>•</span>
                      <span>Assigned to: <span className="text-foreground">{ticket.assignee?.name || "Unassigned"}</span></span>
                    </div>
                  </div>

                  <div className="text-[10px] text-rose-500 text-right shrink-0">
                    <span className="block font-bold">Overdue</span>
                    <span className="block mt-0.5 text-[9px] font-medium text-muted-foreground">
                      Due: {ticket.dueDate ? formatDate(ticket.dueDate) : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: DETAILED TEAM WORKLOAD ──────────────────────────────────────────────────────── */}
      {activeTab === "workload" && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Team Member Workload Report</h3>
            <p className="text-xs text-muted-foreground">Detailed breakdown of total tasks scope, completions, and open issues per member.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teamWorkload.map((w, idx) => {
              const completedPercent = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
              const loadPercent = Math.round((w.total / maxMemberTasks) * 100);

              return (
                <div key={idx} className="bg-background border border-border/55 rounded-xl p-4.5 space-y-4 hover:border-border transition-all">
                  
                  {/* Member Name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {w.user.image ? (
                        <img src={w.user.image} alt="" className="h-7 w-7 rounded-full object-cover border border-border/60 shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {w.user.name?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">{w.user.name || "Member"}</h4>
                        <span className="text-[9px] text-muted-foreground font-semibold leading-none">{w.user.email}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground shrink-0">{w.total} tasks</span>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Total Load Pacing</span>
                      <span>{loadPercent}% relative capacity</span>
                    </div>
                    <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${loadPercent}%` }} />
                    </div>
                  </div>

                  {/* Task Completion Ratios */}
                  <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-3.5 text-center text-xs">
                    <div>
                      <span className="block font-bold text-foreground">{w.open}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mt-0.5">Open Tasks</span>
                    </div>
                    <div>
                      <span className="block font-bold text-green-500">{w.done}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mt-0.5">Completed</span>
                    </div>
                    <div>
                      <span className="block font-bold text-primary">{completedPercent}%</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mt-0.5">Ratio</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}
      
    </div>
  );
}
