"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Folder, Ticket as TicketIcon } from "lucide-react";
import { searchWorkspaceEntities } from "@/actions/ticket.actions";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    tickets: Array<{ id: string; ticketId: string; title: string; project: { id: string; space: { id: string; workspaceId: string } } }>;
    projects: Array<{ id: string; name: string; ticketPrefix: string; space: { id: string; workspaceId: string } }>;
  }>({ tickets: [], projects: [] });
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string | undefined;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults((prev) => {
        if (prev.tickets.length === 0 && prev.projects.length === 0) return prev;
        return { tickets: [], projects: [] };
      });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchWorkspaceEntities(query, workspaceId);
        setResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 hover:bg-accent px-3 py-1.5 rounded-md transition-colors w-full max-w-sm border border-border/50"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search tickets, projects...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-xl bg-background border-border">
          <form onSubmit={handleSearch} className="flex items-center border-b border-border/80 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </form>
          
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Searching...</span>
              </div>
            )}

            {!isLoading && !query && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Start typing to search tickets or projects.
              </div>
            )}

            {!isLoading && query && results.tickets.length === 0 && results.projects.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found for "{query}".
              </div>
            )}

            {!isLoading && (results.tickets.length > 0 || results.projects.length > 0) && (
              <div className="space-y-4">
                {/* Projects Section */}
                {results.projects.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      Projects
                    </h4>
                    <div className="space-y-1">
                      {results.projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            router.push(`/workspace/${project.space.workspaceId}/${project.space.id}/${project.id}`);
                            setOpen(false);
                            setQuery("");
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-accent/65 flex items-center justify-between group transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-amber-500" />
                            <span className="font-medium text-foreground">{project.name}</span>
                          </div>
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground group-hover:bg-background">
                            {project.ticketPrefix}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tickets Section */}
                {results.tickets.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                      Tickets
                    </h4>
                    <div className="space-y-1">
                      {results.tickets.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            router.push(`/workspace/${t.project.space.workspaceId}/${t.project.space.id}/${t.project.id}/ticket/${t.ticketId}`);
                            setOpen(false);
                            setQuery("");
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-accent/65 flex items-center justify-between group transition-all"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <TicketIcon className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate text-foreground font-medium">{t.title}</span>
                          </div>
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono shrink-0 font-bold">
                            {t.ticketId}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
