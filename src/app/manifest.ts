import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NavStream — Remote Facility Command Center",
    short_name: "NavStream",
    description: "Monitor and maintain remote facilities",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e1a",
    theme_color: "#0a0e1a",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/logo.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/logo.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
