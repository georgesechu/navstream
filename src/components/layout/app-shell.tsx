"use client";

import { useAppStore } from "@/stores/app-store";
import { motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "@/components/ui/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore();

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
        {children}
      </motion.main>
    </div>
  );
}
