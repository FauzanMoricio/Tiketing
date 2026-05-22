"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { newPassword } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function NewPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing token!");
      return;
    }

    setIsPending(true);
    setError("");
    setSuccess("");

    try {
      const result = await newPassword(password, token);
      if (result.error) setError(result.error);
      if (result.success) setSuccess(result.success);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Enter new password</CardTitle>
        <CardDescription>Reset your password for Tiket.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-2">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="py-2 px-3 border-primary/50 text-primary">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-2">{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isPending || !!success}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewPasswordForm />
    </Suspense>
  );
}
