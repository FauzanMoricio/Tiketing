"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Social() {
  const onClick = (provider: "github") => {
    signIn(provider, {
      callbackUrl: "/",
    });
  };

  return (
    <div className="flex items-center w-full gap-x-2">
      <Button
        size="lg"
        className="w-full"
        variant="outline"
        onClick={() => onClick("github")}
      >
        <span className="font-bold text-lg mr-2">GH</span> GitHub
      </Button>
    </div>
  );
}
