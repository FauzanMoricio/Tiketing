"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, setIsPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError("");
    setSuccess("");

    try {
      const result = await resetPassword(email);
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
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>Enter your email to receive a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
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
                Sending...
              </>
            ) : (
              "Send reset email"
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
