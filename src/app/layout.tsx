import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
};

export const metadata: Metadata = {
  title: "NavStream — Remote Facility Command Center",
  description:
    "Monitor, operate, and maintain remote facilities with immersive AR/VR, AI diagnostics, and real-time communications.",
  icons: {
    icon: "/logo.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className={`${inter.className} min-h-full bg-[var(--nav-bg-primary)] text-[var(--nav-text-primary)]`}>
        {children}
      </body>
    </html>
  );
}
