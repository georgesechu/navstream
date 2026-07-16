"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SITE_TYPES = [
  "Mining",
  "Processing",
  "Energy",
  "Data Center",
  "Manufacturing",
  "Logistics",
] as const;

interface SiteFormData {
  id?: string;
  name: string;
  type: string;
  lat: number | string;
  lng: number | string;
  timezone: string;
}

export function SiteFormModal({
  isOpen,
  onClose,
  onSuccess,
  editSite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editSite?: SiteFormData | null;
}) {
  const isEditMode = !!editSite;

  const [name, setName] = useState("");
  const [type, setType] = useState<string>(SITE_TYPES[0]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate fields when editing
  useEffect(() => {
    if (editSite) {
      setName(editSite.name);
      setType(editSite.type);
      setLat(String(editSite.lat));
      setLng(String(editSite.lng));
      setTimezone(editSite.timezone || "UTC");
    } else {
      setName("");
      setType(SITE_TYPES[0]);
      setLat("");
      setLng("");
      setTimezone("UTC");
    }
    setError(null);
  }, [editSite, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!lat || isNaN(Number(lat))) {
      setError("Valid latitude is required");
      return;
    }
    if (!lng || isNaN(Number(lng))) {
      setError("Valid longitude is required");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        type,
        lat: Number(lat),
        lng: Number(lng),
        timezone: timezone.trim() || "UTC",
      };

      const url = isEditMode
        ? `/api/sites/${editSite!.id}`
        : "/api/sites";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${isEditMode ? "update" : "create"} site`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = cn(
    "w-full px-3 py-2 rounded-lg text-sm",
    "bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)]",
    "text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)]",
    "outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20",
    "transition-colors"
  );

  const labelClass = "block text-xs font-medium text-[var(--nav-text-secondary)] mb-1.5";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            data-testid="site-form-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-4 rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--nav-border)]">
              <h2 className="text-sm font-semibold text-[var(--nav-text-primary)]">
                {isEditMode ? "Edit Site" : "Add New Site"}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--nav-bg-hover)] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 text-[var(--nav-text-muted)]" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
              {/* Name */}
              <div>
                <label htmlFor="site-name" className={labelClass}>
                  Name
                </label>
                <input
                  id="site-name"
                  data-testid="site-form-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pilbara Iron Ore"
                  className={inputClass}
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label htmlFor="site-type" className={labelClass}>
                  Type
                </label>
                <select
                  id="site-type"
                  data-testid="site-form-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClass}
                >
                  {SITE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="site-lat" className={labelClass}>
                    Latitude
                  </label>
                  <input
                    id="site-lat"
                    data-testid="site-form-lat"
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="-31.956"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="site-lng" className={labelClass}>
                    Longitude
                  </label>
                  <input
                    id="site-lng"
                    data-testid="site-form-lng"
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="141.468"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label htmlFor="site-timezone" className={labelClass}>
                  Timezone
                </label>
                <input
                  id="site-timezone"
                  data-testid="site-form-timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Australia/Sydney"
                  className={inputClass}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-2.5 rounded-lg bg-red/5 border border-red/20">
                  <p className="text-xs text-red">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs text-[var(--nav-text-muted)] hover:bg-[var(--nav-bg-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="site-form-submit"
                  disabled={submitting}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                    "bg-cyan/10 text-cyan border border-cyan/20",
                    "hover:bg-cyan/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {submitting
                    ? isEditMode
                      ? "Saving..."
                      : "Creating..."
                    : isEditMode
                      ? "Save Changes"
                      : "Create Site"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
