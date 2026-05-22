"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Info, 
  Sparkles, 
  Users, 
  Layers, 
  ZoomIn,
  AlertTriangle,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateTicket } from "@/actions/ticket.actions";

interface Member {
  id: string;
  user: {
    name: string;
    image: string | null;
  };
}

interface TimelineTask {
  id: string;
  ticketId: string;
  title: string;
  statusName: string;
  priority: string;
  startDay: number; // Day offset from start of timeline (1 to 30)
  duration: number; // Duration in days
  assigneeName: string;
  assigneeImage: string | null;
  dependencies: string[]; // ticketIds
}

interface TimelineViewProps {
  initialTickets: any[];
  members: Member[];
}

export function TimelineView({ initialTickets, members }: TimelineViewProps) {
  
  // State variables
  const [zoom, setZoom] = useState<"week" | "month" | "year">("month");
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showResourcePlanning, setShowResourcePlanning] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // May 2026

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getWeekNumber = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const daysInCurrentMonth = zoom === "month" ? getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) : 30;
  const totalUnits = zoom === "week" ? 7 : zoom === "month" ? daysInCurrentMonth : 12;

  // Local state for interactive tasks
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const tasksRef = useRef<TimelineTask[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Parse tickets to timeline tasks
  useEffect(() => {
    const windowStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const windowEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const formatted: TimelineTask[] = initialTickets
      .map((t, index) => {
        let dueDate = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt || Date.now());
        if (isNaN(dueDate.getTime())) {
          dueDate = new Date();
        }

        const savedDuration = typeof window !== "undefined" ? localStorage.getItem(`gantt_duration_${t.id}`) : null;
        const duration = savedDuration ? parseInt(savedDuration) : 4;

        const startDate = new Date(dueDate);
        startDate.setDate(startDate.getDate() - duration + 1);

        // Determine if task overlaps with current month/week/year view window
        let overlaps = false;
        if (zoom === "month") {
          overlaps = startDate <= windowEnd && dueDate >= windowStart;
        } else if (zoom === "week") {
          const weekEnd = new Date(currentDate);
          weekEnd.setDate(weekEnd.getDate() + 7);
          overlaps = startDate <= weekEnd && dueDate >= currentDate;
        } else {
          // Zoom === "year"
          const yearStart = new Date(currentDate.getFullYear(), 0, 1);
          const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
          overlaps = startDate <= yearEnd && dueDate >= yearStart;
        }

        // If the ticket has no dueDate, we can show it as a fallback in its createdAt month
        if (!t.dueDate) {
          const createdDate = new Date(t.createdAt || Date.now());
          if (zoom === "month") {
            overlaps = createdDate.getFullYear() === currentDate.getFullYear() && createdDate.getMonth() === currentDate.getMonth();
          } else if (zoom === "week") {
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 7);
            overlaps = createdDate <= weekEnd && createdDate >= currentDate;
          } else {
            overlaps = createdDate.getFullYear() === currentDate.getFullYear();
          }
        }

        if (!overlaps) {
          return null;
        }

        // Calculate startDay relative to currentDate
        let startDay = 1;
        if (zoom === "month" || zoom === "week") {
          const diffTime = startDate.getTime() - currentDate.getTime();
          const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
          startDay = diffDays + 1; // 1-based offset from current date
        } else {
          // Zoom === "year"
          const yearStart = new Date(currentDate.getFullYear(), 0, 1);
          const diffMonths = (startDate.getFullYear() - yearStart.getFullYear()) * 12 + (startDate.getMonth() - yearStart.getMonth());
          startDay = diffMonths + 1;
        }

        // Determine dependencies (e.g. CON-002 depends on CON-001)
        const deps: string[] = [];
        if (index > 0 && index % 2 === 0) {
          deps.push(initialTickets[index - 1].ticketId);
        }

        return {
          id: t.id,
          ticketId: t.ticketId,
          title: t.title,
          statusName: t.status?.name || "Todo",
          priority: t.priority || "medium",
          startDay,
          duration: zoom === "year" ? Math.max(1, Math.round(duration / 30)) : duration,
          assigneeName: t.assignee?.name || "Unassigned",
          assigneeImage: t.assignee?.image || null,
          dependencies: deps
        };
      })
      .filter((task): task is TimelineTask => task !== null);

    // If no tickets exist at all, generate mockup tasks for visual demo
    if (formatted.length === 0 && initialTickets.length === 0) {
      setTasks((prev) => {
        if (prev.length === 5 && prev[0].id === "t1") return prev;
        return [
          {
            id: "t1",
            ticketId: "CON-001",
            title: "Initialize Database Schema",
            statusName: "Done",
            priority: "high",
            startDay: 2,
            duration: 5,
            assigneeName: "Alice Vance",
            assigneeImage: null,
            dependencies: []
          },
          {
            id: "t2",
            ticketId: "CON-002",
            title: "Implement API Endpoints",
            statusName: "In Progress",
            priority: "high",
            startDay: 8,
            duration: 6,
            assigneeName: "Bob Peterson",
            assigneeImage: null,
            dependencies: ["CON-001"]
          },
          {
            id: "t3",
            ticketId: "CON-003",
            title: "Design Landing Page Mockup",
            statusName: "Todo",
            priority: "medium",
            startDay: 5,
            duration: 4,
            assigneeName: "Sarah Connor",
            assigneeImage: null,
            dependencies: []
          },
          {
            id: "t4",
            ticketId: "CON-004",
            title: "Client-side Integration with State",
            statusName: "Todo",
            priority: "high",
            startDay: 15,
            duration: 8,
            assigneeName: "Alice Vance",
            assigneeImage: null,
            dependencies: ["CON-002"]
          },
          {
            id: "t5",
            ticketId: "CON-005",
            title: "Write End-to-End Tests",
            statusName: "Todo",
            priority: "low",
            startDay: 22,
            duration: 6,
            assigneeName: "Bob Peterson",
            assigneeImage: null,
            dependencies: ["CON-004"]
          }
        ];
      });
    } else {
      setTasks(formatted);
    }
  }, [initialTickets, currentDate, zoom, totalUnits]);

  // Dragging states
  const [activeDrag, setActiveDrag] = useState<{
    taskId: string;
    action: "move" | "resize-left" | "resize-right";
    initialX: number;
    initialStartDay: number;
    initialDuration: number;
  } | null>(null);

  // References for width calculations
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Handle Drag Start
  const handleDragStart = (
    e: MouseEvent, 
    taskId: string, 
    action: "move" | "resize-left" | "resize-right"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setActiveDrag({
      taskId,
      action,
      initialX: e.clientX,
      initialStartDay: task.startDay,
      initialDuration: task.duration
    });
  };

  // Handle Drag Move
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!activeDrag || !gridContainerRef.current) return;

      const containerWidth = gridContainerRef.current.offsetWidth;
      const unitWidth = containerWidth / totalUnits;
      
      const deltaX = e.clientX - activeDrag.initialX;
      const deltaDays = Math.round(deltaX / unitWidth);

      setTasks(prevTasks => 
        prevTasks.map(t => {
          if (t.id !== activeDrag.taskId) return t;

          let newStartDay = t.startDay;
          let newDuration = t.duration;

          if (activeDrag.action === "move") {
            newStartDay = Math.max(1, Math.min(totalUnits - t.duration + 1, activeDrag.initialStartDay + deltaDays));
          } else if (activeDrag.action === "resize-left") {
            const possibleStart = Math.max(1, activeDrag.initialStartDay + deltaDays);
            const possibleDuration = activeDrag.initialStartDay + activeDrag.initialDuration - possibleStart;
            if (possibleDuration >= 1) {
              newStartDay = possibleStart;
              newDuration = possibleDuration;
            }
          } else if (activeDrag.action === "resize-right") {
            newDuration = Math.max(1, Math.min(totalUnits - t.startDay + 1, activeDrag.initialDuration + deltaDays));
          }

          return {
            ...t,
            startDay: newStartDay,
            duration: newDuration
          };
        })
      );
    };

    const handleMouseUp = async () => {
      if (activeDrag) {
        const currentTasks = tasksRef.current;
        const task = currentTasks.find(t => t.id === activeDrag.taskId);
        if (task) {
          // Persist the custom duration to localStorage so it isn't reset to 4 days
          localStorage.setItem(`gantt_duration_${task.id}`, task.duration.toString());

          if (task.id.startsWith("t")) {
            toast.success("Timeline Updated (Demo)", {
              description: "Task schedule changed locally.",
            });
          } else {
            const newDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + task.startDay + task.duration - 2);
            try {
              await updateTicket(task.id, { dueDate: newDueDate });
              const monthLabel = currentDate.toLocaleDateString(undefined, { month: "long" });
              toast.success("Schedule Saved", {
                description: `${task.ticketId} due date updated to ${monthLabel} ${newDueDate.getDate()}, ${newDueDate.getFullYear()}.`,
              });
            } catch (err) {
              toast.error("Failed to save schedule change");
            }
          }
        }
        setActiveDrag(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeDrag, zoom, toast, currentDate, totalUnits]);

  // Milestone Markers
  const milestones = [
    { name: "Alpha Release", day: 7, color: "border-green-500 bg-green-500" },
    { name: "Beta Feature Freeze", day: 16, color: "border-amber-500 bg-amber-500" },
    { name: "Production Launch", day: 25, color: "border-purple-500 bg-purple-500" }
  ];

  // Critical path tasks (CON-001 -> CON-002 -> CON-004 -> CON-005)
  const criticalPathIds = ["CON-001", "CON-002", "CON-004", "CON-005"];

  // Helper: check if task is on critical path
  const isOnCriticalPath = (task: TimelineTask) => {
    return showCriticalPath && criticalPathIds.includes(task.ticketId);
  };

  // Navigation Handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (zoom === "month") {
        next.setMonth(next.getMonth() - 1);
      } else if (zoom === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setFullYear(next.getFullYear() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (zoom === "month") {
        next.setMonth(next.getMonth() + 1);
      } else if (zoom === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next;
    });
  };

  // Grid units label based on Zoom
  const getGridHeaders = () => {
    if (zoom === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
      });
    }
    if (zoom === "month") {
      const monthStr = currentDate.toLocaleDateString(undefined, { month: "short" });
      return Array.from({ length: daysInCurrentMonth }, (_, i) => `${monthStr} ${i + 1}`);
    }
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  };

  const headers = getGridHeaders();

  // Resource Loading Map
  const resourceWorkload = () => {
    const workload: Record<string, { days: number[]; count: number[] }> = {};
    
    // Initialize members
    tasks.forEach(t => {
      if (!workload[t.assigneeName]) {
        workload[t.assigneeName] = { 
          days: Array(totalUnits).fill(0),
          count: Array(totalUnits).fill(0) 
        };
      }
    });

    // Populate active days
    tasks.forEach(t => {
      const entry = workload[t.assigneeName];
      if (entry) {
        for (let i = 0; i < t.duration; i++) {
          const index = t.startDay - 1 + i;
          if (index >= 0 && index < totalUnits) {
            entry.days[index] += 1;
          }
        }
      }
    });

    return workload;
  };

  const workloads = resourceWorkload();

  return (
    <div className="space-y-6">
      {/* ── Control Header Panel ──────────────────────────── */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center border border-input rounded-xl overflow-hidden bg-background">
            <button 
              onClick={handlePrev}
              className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground border-r border-input bg-transparent border-0 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-4 text-xs font-bold text-foreground min-w-[120px] text-center">
              {zoom === "week" 
                ? `Wk ${getWeekNumber(currentDate)}, ${currentDate.getFullYear()}` 
                : zoom === "month" 
                ? currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }) 
                : `Year ${currentDate.getFullYear()}`}
            </span>
            <button 
              onClick={handleNext}
              className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground border-l border-input bg-transparent border-0 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-muted/30 border border-border/40 rounded-xl p-1 gap-1">
            <Button
              variant={zoom === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setZoom("week")}
              className="text-xs h-7 px-2.5 rounded-lg"
            >
              Week
            </Button>
            <Button
              variant={zoom === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setZoom("month")}
              className="text-xs h-7 px-2.5 rounded-lg"
            >
              Month
            </Button>
            <Button
              variant={zoom === "year" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setZoom("year")}
              className="text-xs h-7 px-2.5 rounded-lg"
            >
              Year
            </Button>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={showCriticalPath ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className="text-xs gap-1.5 rounded-xl transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Critical Path
          </Button>

          <Button
            variant={showResourcePlanning ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowResourcePlanning(!showResourcePlanning)}
            className="text-xs gap-1.5 rounded-xl transition-all"
          >
            <Users className="h-3.5 w-3.5" />
            Resource Planning
          </Button>
        </div>
      </div>

      {/* ── Main Gantt Chart Grid (Horizontal scrollable with sticky task column) ─────────────────────────── */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-auto shadow-sm max-h-[500px] flex relative min-w-0">
        
        {/* Sticky Left Task Column */}
        <div className="w-[280px] shrink-0 sticky left-0 bg-card border-r border-border/60 z-20 flex flex-col shadow-[4px_0_12px_-3px_rgba(0,0,0,0.06)] divide-y divide-border/40 select-none">
          {/* Header */}
          <div className="h-14 p-4 bg-muted/30 flex items-center justify-between shrink-0 font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
            <span>Tasks & Dependencies</span>
            <Layers className="h-3.5 w-3.5 opacity-60 text-primary" />
          </div>

          {/* Task rows */}
          <div className="flex-1 divide-y divide-border/40 min-h-0 bg-card">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="h-16 px-4 flex flex-col justify-center gap-0.5 min-w-0 hover:bg-muted/15 transition-colors bg-card"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-primary shrink-0">
                    {task.ticketId}
                  </span>
                  {task.dependencies.length > 0 && (
                    <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded font-semibold shrink-0">
                      dep
                    </span>
                  )}
                  <span 
                    className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                      task.statusName.toLowerCase() === "done" 
                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                        : task.statusName.toLowerCase() === "in progress"
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {task.statusName}
                  </span>
                </div>
                <span className="text-xs font-semibold text-foreground truncate" title={task.title}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Right Gantt Grid */}
        <div 
          ref={gridContainerRef}
          className="flex-grow flex flex-col divide-y divide-border/40 z-10 bg-background/5"
          style={{ 
            width: zoom === "week" ? "800px" : zoom === "month" ? "1500px" : "1100px",
            minWidth: zoom === "week" ? "800px" : zoom === "month" ? "1500px" : "1100px"
          }}
        >
          {/* Header Grid */}
          <div 
            className="h-14 border-b border-border/60 bg-muted/20 shrink-0 grid select-none"
            style={{ gridTemplateColumns: `repeat(${totalUnits}, minmax(0, 1fr))` }}
          >
            {headers.map((h, i) => (
              <div 
                key={i} 
                className="h-full border-r border-border/10 flex flex-col items-center justify-center p-1 text-[10px] font-semibold text-muted-foreground"
              >
                {zoom === "month" ? (
                  <>
                    <span className="text-[8px] text-muted-foreground/60 uppercase font-medium">
                      {currentDate.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <span className="text-xs font-bold text-foreground">{i + 1}</span>
                  </>
                ) : (
                  <span className="text-center truncate w-full px-1">{h}</span>
                )}
              </div>
            ))}
          </div>

          {/* Timeline Rows Container */}
          <div className="flex-1 divide-y divide-border/40 relative min-h-0 bg-background/5">
            {/* Render Milestone Markers vertically spanning all rows */}
            {zoom === "month" && milestones.map((m, idx) => (
              <div 
                key={idx} 
                className="absolute top-0 bottom-0 border-l border-dashed border-primary/20 pointer-events-none z-10"
                style={{ left: `${(m.day / totalUnits) * 100}%` }}
              >
                <div className="absolute top-2 -left-1 flex items-center gap-1 bg-background/95 border border-border rounded-md px-1.5 py-0.5 shadow-sm text-[8px] font-bold text-muted-foreground whitespace-nowrap backdrop-blur">
                  <Flag className="h-2 w-2 text-primary" />
                  {m.name}
                </div>
              </div>
            ))}

            {tasks.map((task) => {
              const isCP = isOnCriticalPath(task);
              
              // Skip rendering if task is completely outside the current view range
              if (task.startDay + task.duration - 1 < 1 || task.startDay > totalUnits) {
                return null;
              }

              const gridStart = Math.max(1, task.startDay);
              const gridEnd = Math.min(totalUnits + 1, task.startDay + task.duration);
              
              if (gridStart >= gridEnd) {
                return null;
              }

              return (
                <div 
                  key={task.id} 
                  className="h-16 grid items-center px-4 relative group hover:bg-muted/10 transition-colors"
                  style={{ gridTemplateColumns: `repeat(${totalUnits}, minmax(0, 1fr))` }}
                >
                  {/* Vertical background helper gridlines */}
                  {Array.from({ length: totalUnits }).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute top-0 bottom-0 border-r border-border/5 h-full pointer-events-none"
                      style={{ left: `${(i / totalUnits) * 100}%` }}
                    />
                  ))}

                  {/* Task Duration Visual Bar */}
                  <div 
                    className={`h-9 rounded-xl flex items-center justify-between px-3 text-[10px] font-bold text-white shadow-md relative group/bar transition-all hover:scale-[1.01] hover:shadow-lg ${
                      isCP 
                        ? "bg-gradient-to-r from-red-600 to-rose-500 ring-2 ring-red-400 ring-offset-2 ring-offset-background cursor-move"
                        : task.statusName.toLowerCase() === "done"
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 cursor-move"
                        : task.statusName.toLowerCase() === "in progress"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-500 cursor-move"
                        : "bg-gradient-to-r from-slate-600 to-slate-500 cursor-move"
                    }`}
                    style={{
                      gridColumnStart: gridStart,
                      gridColumnEnd: gridEnd,
                    }}
                    onMouseDown={(e) => handleDragStart(e, task.id, "move")}
                  >
                    {/* Left drag resize handle */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/20 cursor-w-resize rounded-l-xl transition-colors"
                      onMouseDown={(e) => handleDragStart(e, task.id, "resize-left")}
                    />

                    {/* Content inside bar */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 px-1 select-none">
                      <span className="truncate">{task.title}</span>
                      <span className="text-[8px] font-normal opacity-70 shrink-0">({task.duration}d)</span>
                    </div>

                    {/* Assignee Avatar / Initial */}
                    <div 
                      className="h-5 w-5 rounded-full bg-white/20 text-white border border-white/30 flex items-center justify-center font-bold text-[8px] shrink-0"
                      title={`Assigned to: ${task.assigneeName}`}
                    >
                      {task.assigneeName.charAt(0).toUpperCase()}
                    </div>

                    {/* Right drag resize handle */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/20 cursor-e-resize rounded-r-xl transition-colors"
                      onMouseDown={(e) => handleDragStart(e, task.id, "resize-right")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Resource Planning Block ───────────────────────── */}
      {showResourcePlanning && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Resource Load & Allocation</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">Concurrent active tasks per user</span>
          </div>

          <div className="space-y-4">
            {Object.entries(workloads).map(([name, work]) => {
              const maxLoad = Math.max(...work.days);
              const isOverloaded = maxLoad > 1;

              return (
                <div key={name} className="flex items-center justify-between gap-4">
                  <div className="w-[180px] flex items-center gap-2 shrink-0 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground truncate block">{name}</span>
                      {isOverloaded && (
                        <span className="text-[8px] font-semibold text-rose-500 flex items-center gap-0.5">
                          <AlertTriangle className="h-2 w-2" />
                          Overloaded (Max {maxLoad} Tasks)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Load Grid */}
                  <div 
                    className="flex-1 grid gap-0.5 h-6 min-w-[500px]"
                    style={{ gridTemplateColumns: `repeat(30, minmax(0, 1fr))` }}
                  >
                    {work.days.map((load, idx) => (
                      <div 
                        key={idx} 
                        className={`h-full rounded-sm transition-colors ${
                          load === 0 
                            ? "bg-muted/20" 
                            : load === 1 
                            ? "bg-green-500/40" 
                            : "bg-rose-500/60 animate-pulse"
                        }`}
                        title={`${name}: ${load} task(s) active on Day ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info panel */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 text-xs text-primary/80">
        <Info className="h-5 w-5 text-primary shrink-0" />
        <div>
          <span className="font-bold text-primary block mb-0.5">Timeline Operations</span>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Drag Tasks</strong> to shift start and end dates horizontally.</li>
            <li><strong>Resize Handles</strong> at task margins allow extending/reducing panned duration.</li>
            <li><strong>Critical Path</strong> highlights blockers directly on tasks in glowing red.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
