"use client";

import { useState, useEffect, useTransition } from "react";
import { getUserProfile, updateProfile, updatePassword } from "@/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Sparkles, KeyRound, User } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  hasPassword: boolean;
}

export function UserProfileSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [isPendingProfile, startUpdateProfile] = useTransition();
  const [isPendingPassword, startUpdatePassword] = useTransition();

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    const data = await getUserProfile();
    if (data) {
      setProfile(data);
      setName(data.name || "");
      setEmail(data.email || "");
      setAvatarUrl(data.image || "");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleGenerateAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const newAvatar = `https://api.dicebear.com/7.x/lorelei/svg?seed=${randomSeed}`;
    setAvatarUrl(newAvatar);
    toast.success("Generated a new avatar! Don't forget to save changes.");
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const formData = new FormData(e.currentTarget);
    formData.set("image", avatarUrl); // ensure the generated image is sent

    startUpdateProfile(async () => {
      const res = await updateProfile(null, formData);
      if (res.error) {
        setProfileError(res.error);
        toast.error(res.error);
      } else if (res.success) {
        setProfileSuccess(res.success);
        toast.success(res.success);
        // Reload page header / session
        window.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("profile-update"));
        loadProfile();
      }
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startUpdatePassword(async () => {
      const res = await updatePassword(null, formData);
      if (res.error) {
        setPasswordError(res.error);
        toast.error(res.error);
      } else if (res.success) {
        setPasswordSuccess(res.success);
        toast.success(res.success);
        form.reset();
        loadProfile();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your profile settings...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load profile. Please sign in again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
      {/* ── Left Side: Avatar Display & Action Card ────────────────── */}
      <div className="md:col-span-1 space-y-6">
        <Card className="border-border/40 bg-card/30 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
            <div className="relative group mb-4">
              <Avatar className="h-24 w-24 border-2 border-border shadow-md transition-transform duration-300 group-hover:scale-105">
                <AvatarImage src={avatarUrl} alt={name || "User Avatar"} className="object-cover" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {(name || email || "M").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleGenerateAvatar}
                className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Generate Random Avatar"
              >
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              </button>
            </div>

            <h3 className="font-semibold text-lg text-foreground truncate max-w-full">
              {name || "No Name Set"}
            </h3>
            <p className="text-xs text-muted-foreground truncate max-w-full mb-1">
              {email}
            </p>
            <div className="mt-2.5 px-3 py-1 rounded-full bg-accent/50 border border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {profile.hasPassword ? "Credentials Account" : "OAuth Account"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Right Side: Edit Profile Details & Password ─────────────── */}
      <div className="md:col-span-2 space-y-6">
        {/* Profile Details Card */}
        <Card className="border-border/45 bg-card/45 backdrop-blur-md shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Profile Information
            </CardTitle>
            <CardDescription className="text-xs">
              Update your personal details and public profile avatar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileSuccess && (
                <Alert className="py-2.5 px-3 border-emerald-500/20 bg-emerald-500/5 rounded-xl text-emerald-500">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-xs font-semibold ml-2 leading-normal">
                    {profileSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {profileError && (
                <Alert variant="destructive" className="py-2 px-3 border-destructive/20 bg-destructive/5 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-xs font-medium ml-2 leading-normal">
                    {profileError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                  disabled={isPendingProfile}
                  className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isPendingProfile}
                  className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="image" className="text-xs font-semibold">Avatar Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    name="image"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    disabled={isPendingProfile}
                    className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateAvatar}
                    className="h-10 rounded-xl text-xs px-3 font-semibold border-border hover:bg-accent shrink-0"
                  >
                    Randomize
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPendingProfile}
                className="rounded-xl h-10 text-sm font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all bg-primary hover:bg-primary/95 px-5"
              >
                {isPendingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-border/45 bg-card/45 backdrop-blur-md shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Security & Password
            </CardTitle>
            <CardDescription className="text-xs">
              Change your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordSuccess && (
                <Alert className="py-2.5 px-3 border-emerald-500/20 bg-emerald-500/5 rounded-xl text-emerald-500">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-xs font-semibold ml-2 leading-normal">
                    {passwordSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {passwordError && (
                <Alert variant="destructive" className="py-2 px-3 border-destructive/20 bg-destructive/5 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-xs font-medium ml-2 leading-normal">
                    {passwordError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Only ask for current password if they have a password already set */}
              {profile.hasPassword && (
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className="text-xs font-semibold">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    disabled={isPendingPassword}
                    placeholder="••••••••"
                    className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  disabled={isPendingPassword}
                  placeholder="••••••••"
                  className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  disabled={isPendingPassword}
                  placeholder="••••••••"
                  className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={isPendingPassword}
                className="rounded-xl h-10 text-sm font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all bg-primary hover:bg-primary/95 px-5"
              >
                {isPendingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  profile.hasPassword ? "Update Password" : "Set Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
