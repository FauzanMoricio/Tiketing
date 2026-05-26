"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  Folder, 
  CheckSquare, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  Loader2, 
  ArrowLeft, 
  Search, 
  KeyRound,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createAccountByAdmin, updateUserRoleByAdmin, deleteUserByAdmin } from "@/actions/admin.actions";

interface Stats {
  totalUsers: number;
  totalWorkspaces: number;
  totalTickets: number;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: Date;
}

interface AdminDashboardProps {
  initialStats: Stats;
  initialUsers: User[];
  currentUserId: string;
}

export function AdminDashboardClient({ 
  initialStats, 
  initialUsers, 
  currentUserId 
}: AdminDashboardProps) {
  const router = useRouter();
  
  // Local state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name.trim() || !email.trim()) return;

    try {
      setIsCreating(true);
      await createAccountByAdmin({
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        role,
      });

      toast.success("Account created successfully!");
      setCreateOpen(false);
      
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      
      router.refresh();
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error?.message || "Failed to create account.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRoleByAdmin(userId, newRole);
      toast.success("Role updated successfully!");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update role.");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await deleteUserByAdmin(deleteId);
      toast.success("User deleted successfully!");
      setDeleteId(null);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
      case "user":
        return "bg-primary/10 text-primary border border-primary/20";
      case "viewer":
        return "bg-muted text-muted-foreground border border-border";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldAlert className="h-3.5 w-3.5 mr-1" />;
      case "user":
        return <ShieldCheck className="h-3.5 w-3.5 mr-1" />;
      default:
        return <Shield className="h-3.5 w-3.5 mr-1" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Navbar ───────────────────────────────────────────── */}
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/40"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                Tiket Admin Console
              </h1>
              <p className="text-[10px] text-muted-foreground">Manage workspace accounts and platform statistics</p>
            </div>
          </div>
          <Link href="/">
            <Button size="sm" variant="outline" className="text-xs h-8 font-semibold rounded-xl">
              Back to App
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        
        {/* ── Stats Grid ──────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Accounts</CardTitle>
              <div className="p-2 bg-primary/10 rounded-xl">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Users registered on this platform</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/30 backdrop-blur-sm relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Workspaces</CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Folder className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWorkspaces}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Active collaborative spaces created</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/30 backdrop-blur-sm relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Resolved</CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <CheckSquare className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Total tasks tracking on the system</p>
            </CardContent>
          </Card>
        </section>

        {/* ── Users Management Card ────────────────────────────── */}
        <section>
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm shadow-xl">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
              <div>
                <CardTitle className="text-base font-bold">User Management</CardTitle>
                <CardDescription className="text-xs">Create, delete and configure roles for registered platform users.</CardDescription>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-background/50 border-border/80 focus:border-primary/60"
                  />
                </div>
                
                <Button 
                  size="sm" 
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 h-9 text-xs font-semibold rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  Create User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-t border-border/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground bg-muted/20">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Registered At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {filteredUsers.map((user) => {
                      const isSelf = user.id === currentUserId;
                      return (
                        <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-3.5 font-medium text-foreground">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                {(user.name || "").charAt(0) || (user.email || "").charAt(0).toUpperCase() || "?"}
                              </div>
                              <div>
                                <p className="font-semibold flex items-center gap-1.5">
                                  {user.name || "N/A"}
                                  {isSelf && (
                                    <span className="text-[9px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-normal">
                                      You
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-muted-foreground">{user.email}</td>
                          <td className="px-6 py-3.5">
                            {isSelf ? (
                              <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${getRoleBadgeStyle(user.role)}`}>
                                {getRoleIcon(user.role)}
                                {user.role}
                              </div>
                            ) : (
                              <Select
                                defaultValue={user.role}
                                onValueChange={(val) => handleRoleChange(user.id as string, val as string)}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-[11px] rounded-lg">
                                  <SelectValue>
                                    {(val) => {
                                      if (val === "admin") return "Admin";
                                      if (val === "user") return "User";
                                      return val;
                                    }}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                onClick={() => setDeleteId(user.id as string)}
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-muted-foreground">
                          No users found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* ── Create User Modal ─────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-base font-bold">
              <Plus className="h-5 w-5 text-primary" />
              Register User Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter details below to create a login account. The default workspace will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-4">
            {errorMsg && (
              <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 rounded-md border border-destructive/20">
                {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-xs font-semibold">Full Name</Label>
              <Input
                id="create-name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                required
                className="h-10 text-xs rounded-xl bg-background/50 border-border/80"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-email" className="text-xs font-semibold">Email Address</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isCreating}
                required
                className="h-10 text-xs rounded-xl bg-background/50 border-border/80"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="create-password" className="text-xs font-semibold">Password</Label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  Default: Password123
                </span>
              </div>
              <Input
                id="create-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isCreating}
                className="h-10 text-xs rounded-xl bg-background/50 border-border/80"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-role" className="text-xs font-semibold">System Role</Label>
              <Select value={role} onValueChange={(val) => val && setRole(val)} disabled={isCreating}>
                <SelectTrigger id="create-role" className="w-full h-10 text-xs rounded-xl">
                  <SelectValue>
                    {(val) => {
                      if (val === "user") return "User (Create Workspace, Projects & Tickets)";
                      if (val === "admin") return "Admin (Manage Platform Settings & Users)";
                      return val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Create Workspace, Projects & Tickets)</SelectItem>
                  <SelectItem value="admin">Admin (Manage Platform Settings & Users)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !name.trim() || !email.trim()} className="text-xs rounded-xl">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-base font-bold">
              Delete User Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently delete this user? All their workspace memberships, assignments, and access logs will be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteUser}
              className="text-xs rounded-xl"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
