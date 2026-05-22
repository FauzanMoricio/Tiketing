import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// ============================================================
// Font Configuration
// ============================================================
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// ============================================================
// SEO Metadata
// ============================================================
export const metadata: Metadata = {
  title: "Tiket — Project Management",
  description:
    "Modern kanban-based project management and ticketing platform. Organize your work with workspaces, spaces, projects, and drag-and-drop boards.",
  keywords: [
    "project management",
    "kanban",
    "ticketing",
    "task management",
  ],
};

// ============================================================
// Root Layout
// ============================================================
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
