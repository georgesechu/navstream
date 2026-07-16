import { AppShell } from "@/components/layout/app-shell";
import { CommandMap } from "@/components/map/command-map";

export default function DashboardHome() {
  return (
    <AppShell>
      <CommandMap />
    </AppShell>
  );
}
