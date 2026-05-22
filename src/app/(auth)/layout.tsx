import { ReactNode } from "react";
import { Layers3 } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground font-sans p-4 overflow-hidden">
      {/* Decorative premium glowing radial background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-[400px]">
        {/* App Logo */}
        <div className="flex items-center gap-2.5 mb-8 select-none group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
            <Layers3 className="h-5.5 w-5.5" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Tiket
          </span>
        </div>
        
        {/* Auth Page Content Wrapper */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
