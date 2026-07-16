"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SiteDetailView } from "@/components/canvas/site-detail";
import { useParams, useSearchParams } from "next/navigation";

export default function SitePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const siteId = params.id as string;
  const highlightEquipmentId = searchParams.get("equipment") ?? undefined;
  const highlightAlertId = searchParams.get("alert") ?? undefined;

  return (
    <AppShell>
      <SiteDetailView
        siteId={siteId}
        highlightEquipmentId={highlightEquipmentId}
        highlightAlertId={highlightAlertId}
      />
    </AppShell>
  );
}
