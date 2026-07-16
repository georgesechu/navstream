"use client";

import { useAppStore } from "@/stores/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "@/components/ui/command-palette";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--nav-bg-primary)]">
      <Sidebar />
      <Topbar />
      <CommandPalette />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="pt-14 min-h-screen"
      >
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </motion.main>
    </div>
  );
}
