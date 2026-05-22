"use client";

import { useActionState } from "react";
import Link from "next/link";
import { authenticate } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [errorMessage, dispatch, isPending] = useActionState(
    authenticate,
    undefined
  );

  return (
    <Card className="border-border/45 bg-card/45 backdrop-blur-md shadow-2xl rounded-2xl relative overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-6">
        <CardTitle className="text-xl font-bold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription className="text-xs">
          Sign in to your account to continue working.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={dispatch} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Link
                href="/reset"
                className="text-xs text-primary hover:text-primary/95 hover:underline font-semibold transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-background/50 border-border/80 focus:border-primary/60 focus:ring-primary/10 transition-all rounded-xl h-10 px-3 text-sm"
            />
          </div>

          {errorMessage && (
            <Alert variant="destructive" className="py-2 px-3 border-destructive/20 bg-destructive/5 rounded-xl">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <AlertDescription className="text-xs font-medium text-destructive ml-2 leading-normal">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full rounded-xl h-10 text-sm font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 bg-primary hover:bg-primary/95" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in with Email"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
