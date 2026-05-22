"use client";

import { useCallback, useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { newVerification } from "@/actions/auth.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function NewVerificationForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const hasSubmitted = useRef(false);

  const onSubmit = useCallback(async () => {
    if (hasSubmitted.current) return;
    if (!token) {
      setError("Missing token!");
      return;
    }
    hasSubmitted.current = true;

    try {
      const result = await newVerification(token);
      if (result.success) setSuccess(result.success);
      if (result.error) setError(result.error);
    } catch {
      setError("Something went wrong");
    }
  }, [token]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle>Confirming your verification</CardTitle>
        <CardDescription>Please wait while we verify your email address.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        {!success && !error && (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}

        {error && (
          <Alert variant="destructive" className="py-2 px-3 w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="py-2 px-3 border-primary/50 text-primary w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">{success}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground w-full">
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewVerificationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewVerificationForm />
    </Suspense>
  );
}
