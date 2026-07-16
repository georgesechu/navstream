"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useSites } from "@/hooks/use-sites";
import { SiteFormModal } from "@/components/canvas/site-form-modal";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Search,
  Filter,
  Plus,
  Pencil,
} from "lucide-react";
import Link from "next/link";

const statusConfig = {
  online: { color: "bg-green", label: "Online", textColor: "text-green" },
  warning: { color: "bg-amber", label: "Warning", textColor: "text-amber" },
  critical: { color: "bg-red", label: "Critical", textColor: "text-red" },
  offline: { color: "bg-[var(--nav-text-muted)]", label: "Offline", textColor: "text-[var(--nav-text-muted)]" },
};

interface EditSiteData {
  id: string;
  name: string;
  type: string;
  lat: number | string;
  lng: number | string;
  timezone: string;
}

export default function SitesPage() {
  const { sites, isLoading, refetch } = useSites();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSite, setEditSite] = useState<EditSiteData | null>(null);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--nav-text-primary)] flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
              Sites
            </h1>
            <p className="text-sm text-[var(--nav-text-muted)] mt-1">
              Manage and monitor all registered facilities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="sites-filter-btn" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] text-[var(--nav-text-muted)] text-xs hover:border-[var(--nav-bg-hover)] transition-colors">
              <Filter className="w-3 h-3" />
              Filter
            </button>
            <button
              data-testid="sites-add-btn"
              onClick={() => {
                setEditSite(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan/10 text-cyan text-xs font-medium border border-cyan/20 hover:bg-cyan/20 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Site
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)]">
          <Search className="w-4 h-4 text-[var(--nav-text-muted)]" />
          <input
            type="text"
            placeholder="Search sites by name, type, or location..."
            data-testid="sites-search-input"
            className="flex-1 bg-transparent text-sm text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)] outline-none"
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
              <span className="text-xs text-[var(--nav-text-muted)]">Loading sites...</span>
            </div>
          </div>
        )}

        {/* Sites table-like list */}
        {!isLoading && <div data-testid="sites-table" className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-[var(--nav-border)] bg-[var(--nav-bg-tertiary)]">
            <span className="text-[11px] font-medium text-[var(--nav-text-muted)] uppercase tracking-wider">
              Site
            </span>
            <span className="text-[11px] font-medium text-[var(--nav-text-muted)] uppercase tracking-wider">
              Status
            </span>
            <span className="text-[11px] font-medium text-[var(--nav-text-muted)] uppercase tracking-wider">
              Uptime
            </span>
            <span className="text-[11px] font-medium text-[var(--nav-text-muted)] uppercase tracking-wider">
              Personnel
            </span>
            <span className="text-[11px] font-medium text-[var(--nav-text-muted)] uppercase tracking-wider">
              Alerts
            </span>
            <span className="w-8" />
          </div>

          {/* Rows */}
          {sites.map((site, i) => {
            const status = statusConfig[site.status];
            return (
              <motion.div
                key={site.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/sites/${site.id}`}
                  data-testid={`sites-row-${site.id}`}
                  className={cn(
                    "grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center",
                    "border-b border-[var(--nav-border-subtle)] last:border-b-0",
                    "hover:bg-[var(--nav-bg-hover)] transition-colors group cursor-pointer"
                  )}
                >
                  {/* Site name */}
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[var(--nav-text-muted)] group-hover:text-cyan transition-colors" />
                    <div>
                      <p className="text-sm font-medium text-[var(--nav-text-primary)] group-hover:text-cyan transition-colors">
                        {site.name}
                      </p>
                      <p className="text-[11px] text-[var(--nav-text-muted)]">
                        {site.type} &middot; {site.lat.toFixed(2)}°, {site.lng.toFixed(2)}°
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", status.color)} />
                    <span className={cn("text-xs font-medium", status.textColor)}>
                      {status.label}
                    </span>
                  </div>

                  {/* Uptime */}
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[var(--nav-text-muted)]" />
                    <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
                      {site.uptime}%
                    </span>
                  </div>

                  {/* Personnel */}
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[var(--nav-text-muted)]" />
                    <span className="text-xs font-mono text-[var(--nav-text-secondary)]">
                      {site.personnelCount}
                    </span>
                  </div>

                  {/* Alerts */}
                  <div>
                    {site.activeAlerts > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber" />
                        <span className="text-xs font-mono text-amber">
                          {site.activeAlerts}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--nav-text-muted)]">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      data-testid={`sites-row-${site.id}-edit`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditSite({
                          id: site.id,
                          name: site.name,
                          type: site.type,
                          lat: site.lat,
                          lng: site.lng,
                          timezone: "",
                        });
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--nav-bg-tertiary)] transition-all"
                      aria-label={`Edit ${site.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5 text-[var(--nav-text-muted)] hover:text-cyan" />
                    </button>
                    <ArrowUpRight className="w-4 h-4 text-[var(--nav-text-muted)] group-hover:text-cyan transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>}
      </div>

      <SiteFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditSite(null);
        }}
        onSuccess={() => refetch()}
        editSite={editSite}
      />
    </AppShell>
  );
}
