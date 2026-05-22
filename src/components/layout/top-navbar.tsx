"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSidebarStore } from "@/store/sidebar-store";
import { Menu, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CommandPalette } from "./command-palette";
import { getProjectWithBoard } from "@/actions/project.actions";
import { CreateTicketModal } from "@/components/modals/create-ticket-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface BreadcrumbProp {
  label: string;
  href?: string;
}

interface TopNavbarProps {
  breadcrumbs?: BreadcrumbProp[];
  actions?: ReactNode;
  currentTicketId?: string;
  currentTicketIdReadable?: string;
}

export function TopNavbar({ 
  breadcrumbs, 
  actions,
  currentTicketId,
  currentTicketIdReadable,
}: TopNavbarProps) {
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const router = useRouter();
  const params = useParams();
  
  // Project specific data for quick ticket creation
  const [projectData, setProjectData] = useState<{
    statuses: { id: string; name: string }[];
    members: { user: { id: string; name: string | null; image: string | null } }[];
  } | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [initialRelationType, setInitialRelationType] = useState<string | undefined>(undefined);
  const [initialRelationTicketId, setInitialRelationTicketId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (params.projectId) {
      getProjectWithBoard(params.projectId as string)
        .then((proj) => {
          if (proj) {
            setProjectData({
              statuses: proj.statuses.map((s) => ({ id: s.id, name: s.name })),
              members: proj.space.workspace.members as any,
            });
          }
        })
        .catch((err) => console.error("Failed to load project details:", err));
    } else {
      setProjectData((prev) => {
        if (prev === null) return null;
        return null;
      });
    }
  }, [params.projectId]);

  const handleNewIssueClick = () => {
    if (projectData && projectData.statuses.length > 0) {
      setInitialRelationType(undefined);
      setInitialRelationTicketId(undefined);
      setTicketModalOpen(true);
    }
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        <Button variant="ghost" size="icon" className="-ml-1 h-8 w-8" onClick={toggleCollapsed}>
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <div className="w-px h-4 bg-border mx-2" />
        
        <div className="flex flex-1 items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs?.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                  <BreadcrumbItem className="hidden md:block">
                    {item.href ? (
                      <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="flex items-center gap-4">
            <CommandPalette />
            
            {projectData && projectData.statuses.length > 0 && (
              <div className="flex items-center -space-x-px shrink-0">
                {/* Primary New Issue Button */}
                <Button
                  size="sm"
                  onClick={handleNewIssueClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 h-8 px-3 text-xs rounded-l-md rounded-r-none border-r border-primary-foreground/15 shadow-sm transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New issue
                </Button>

                {/* Dropdown Toggle Chevron */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-7 px-0 rounded-r-md rounded-l-none shadow-sm transition-all flex items-center justify-center cursor-pointer focus:outline-none border-l border-primary-foreground/15">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover border border-border p-1.5 shadow-xl rounded-lg">
                    <div className="px-2 py-1.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                      Will be linked to current as:
                    </div>
                    {[
                      "relates to",
                      "is required for",
                      "depends on",
                      "is duplicated by",
                      "duplicates",
                      "parent for",
                      "subtask of",
                      "clones",
                      "is cloned by"
                    ].map((relation) => {
                      const typeValue = relation.replace(/ /g, "_");
                      return (
                        <DropdownMenuItem
                          key={relation}
                          className="text-xs py-1.5 px-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground transition-all capitalize"
                          onClick={() => {
                            setInitialRelationType(typeValue);
                            setInitialRelationTicketId(currentTicketId);
                            setTicketModalOpen(true);
                          }}
                        >
                          {relation}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {actions}
          </div>
        </div>
      </header>

      {/* Quick ticket creation modal */}
      {projectData && projectData.statuses.length > 0 && (
        <CreateTicketModal
          projectId={params.projectId as string}
          statusId={projectData.statuses[0].id}
          isOpen={ticketModalOpen}
          onClose={() => {
            setTicketModalOpen(false);
            setInitialRelationType(undefined);
            setInitialRelationTicketId(undefined);
          }}
          members={projectData.members}
          initialRelationType={initialRelationType}
          initialRelationTicketId={initialRelationTicketId}
        />
      )}
    </>
  );
}
