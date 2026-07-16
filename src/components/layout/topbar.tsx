"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Signal,
  ChevronDown,
  Command,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface UserInfo {
  displayName: string;
  role: string;
}

export function Topbar() {
  const { sidebarCollapsed, sites, setCommandPaletteOpen } = useAppStore();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    displayName: "User",
    role: "user",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data.user) {
          setUserInfo({
            displayName: data.user.displayName || data.user.username || "User",
            role: data.user.role || "user",
          });
        }
      })
      .catch(() => {
        // Keep defaults on error
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onlineCount = sites.filter((s) => s.status === "online").length;
  const alertCount = sites.reduce((acc, s) => acc + s.activeAlerts, 0);

  return (
    <motion.header
      initial={false}
      animate={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        "fixed top-0 right-0 z-30 h-14",
        "bg-[var(--nav-bg-secondary)]/80 backdrop-blur-xl",
        "border-b border-[var(--nav-border)]",
        "flex items-center justify-between px-4"
      )}
      style={{ left: sidebarCollapsed ? 64 : 240 }}
    >
      {/* Left: Search */}
      <div className="flex items-center gap-3">
        <button onClick={() => setCommandPaletteOpen(true)} data-testid="topbar-search-btn" aria-label="Search sites and equipment" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] hover:border-[var(--nav-bg-hover)] transition-all text-sm">
          <Search className="w-3.5 h-3.5" />
          <span>Search sites, equipment...</span>
          <kbd className="ml-6 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] text-[10px] text-[var(--nav-text-muted)]">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>

      {/* Right: Status & User */}
      <div className="flex items-center gap-4">
        {/* Live system status */}
        <div data-testid="topbar-system-status" className="flex items-center gap-4 px-3 py-1 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green status-online" />
            <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
              {onlineCount}/{sites.length} ONLINE
            </span>
          </div>
          <div className="w-px h-4 bg-[var(--nav-border)]" />
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3 text-cyan" />
            <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
              LIVE
            </span>
          </div>
        </div>

        {/* Alerts */}
        <button data-testid="topbar-alert-badge" aria-label={`Alerts: ${alertCount} active`} className="relative p-2 rounded-lg hover:bg-[var(--nav-bg-hover)] transition-colors">
          <Bell className="w-4.5 h-4.5 text-[var(--nav-text-secondary)]" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red text-white text-[10px] font-bold shadow-[0_0_8px_rgba(255,23,68,0.4)]">
              {alertCount}
            </span>
          )}
        </button>

        {/* User */}
        <div className="relative">
          <button
            data-testid="topbar-user-menu"
            aria-label="User menu"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--nav-bg-hover)] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-dim to-magenta flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {userInfo.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span data-testid="topbar-user-name" className="text-xs font-medium text-[var(--nav-text-primary)]">
                {userInfo.displayName.split(" ")[0]}
              </span>
              <span data-testid="topbar-user-role" className="text-[10px] text-[var(--nav-text-muted)] capitalize">
                {userInfo.role}
              </span>
            </div>
            <ChevronDown className={cn("w-3 h-3 text-[var(--nav-text-muted)] transition-transform", showUserMenu && "rotate-180")} />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-[var(--nav-border)]">
                  <p className="text-xs font-medium text-[var(--nav-text-primary)]">{userInfo.displayName}</p>
                  <p className="text-[10px] text-[var(--nav-text-muted)] capitalize">{userInfo.role}</p>
                </div>
                <button
                  data-testid="topbar-logout-btn"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    router.push("/login");
                    router.refresh();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red hover:bg-red/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
