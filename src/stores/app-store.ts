import { create } from "zustand";

export interface Site {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "warning" | "critical" | "offline";
  type: string;
  personnelCount: number;
  activeAlerts: number;
  uptime: number;
}

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  activeSiteId: string | null;
  setActiveSite: (id: string | null) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Demo sites
  sites: Site[];
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  activeSiteId: null,
  setActiveSite: (id) => set({ activeSiteId: id }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  sites: [
    {
      id: "site-1",
      name: "Kalgoorlie Gold Mine",
      lat: -30.749,
      lng: 121.466,
      status: "online",
      type: "Mining",
      personnelCount: 12,
      activeAlerts: 0,
      uptime: 99.7,
    },
    {
      id: "site-2",
      name: "Pilbara Iron Ore",
      lat: -22.297,
      lng: 118.775,
      status: "warning",
      type: "Mining",
      personnelCount: 8,
      activeAlerts: 3,
      uptime: 97.2,
    },
    {
      id: "site-3",
      name: "Broken Hill Processing",
      lat: -31.956,
      lng: 141.468,
      status: "critical",
      type: "Processing",
      personnelCount: 5,
      activeAlerts: 7,
      uptime: 89.1,
    },
    {
      id: "site-4",
      name: "Darwin LNG Terminal",
      lat: -12.46,
      lng: 130.845,
      status: "online",
      type: "Energy",
      personnelCount: 15,
      activeAlerts: 1,
      uptime: 99.9,
    },
    {
      id: "site-5",
      name: "Atacama Solar Farm",
      lat: -23.5,
      lng: -68.2,
      status: "online",
      type: "Energy",
      personnelCount: 4,
      activeAlerts: 0,
      uptime: 99.5,
    },
    {
      id: "site-6",
      name: "Svalbard Data Center",
      lat: 78.23,
      lng: 15.63,
      status: "offline",
      type: "Data Center",
      personnelCount: 0,
      activeAlerts: 12,
      uptime: 0,
    },
  ],
}));
