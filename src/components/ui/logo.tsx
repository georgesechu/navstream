"use client";

import { cn } from "@/lib/utils";

export function NavStreamLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Main gradient - cyan to deep blue */}
        <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#0057b7" />
        </linearGradient>

        {/* Glow gradient */}
        <radialGradient id="logo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>

        {/* Inner accent gradient */}
        <linearGradient id="logo-accent" x1="20" y1="16" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#80f0ff" stopOpacity="0.8" />
        </linearGradient>

        {/* Stream lines gradient */}
        <linearGradient id="stream-grad" x1="0" y1="32" x2="64" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0" />
          <stop offset="40%" stopColor="#00e5ff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>

        {/* Clip for rounded square */}
        <clipPath id="logo-clip">
          <rect x="2" y="2" width="60" height="60" rx="14" />
        </clipPath>

        {/* Drop shadow filter */}
        <filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e5ff" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background glow */}
      <rect x="0" y="0" width="64" height="64" rx="16" fill="url(#logo-glow)" />

      {/* Main container */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="14"
        fill="#0a1628"
        stroke="url(#logo-grad)"
        strokeWidth="1.5"
      />

      {/* Subtle grid inside */}
      <g clipPath="url(#logo-clip)" opacity="0.08">
        <line x1="2" y1="22" x2="62" y2="22" stroke="#00e5ff" strokeWidth="0.5" />
        <line x1="2" y1="42" x2="62" y2="42" stroke="#00e5ff" strokeWidth="0.5" />
        <line x1="22" y1="2" x2="22" y2="62" stroke="#00e5ff" strokeWidth="0.5" />
        <line x1="42" y1="2" x2="42" y2="62" stroke="#00e5ff" strokeWidth="0.5" />
      </g>

      {/* Nav arrow / compass element - the main "N" shape formed as a navigation arrow */}
      <g filter="url(#logo-shadow)">
        {/* Upward-pointing arrow/chevron — represents navigation */}
        <path
          d="M32 14 L44 30 L38 30 L38 46 L26 46 L26 30 L20 30 Z"
          fill="url(#logo-accent)"
          opacity="0.95"
        />
      </g>

      {/* Stream lines — three horizontal data-flow lines through the arrow */}
      <g opacity="0.5">
        <line x1="10" y1="33" x2="25" y2="33" stroke="url(#stream-grad)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="39" y1="33" x2="54" y2="33" stroke="url(#stream-grad)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g opacity="0.35">
        <line x1="8" y1="38" x2="25" y2="38" stroke="url(#stream-grad)" strokeWidth="1" strokeLinecap="round" />
        <line x1="39" y1="38" x2="56" y2="38" stroke="url(#stream-grad)" strokeWidth="1" strokeLinecap="round" />
      </g>
      <g opacity="0.2">
        <line x1="12" y1="43" x2="25" y2="43" stroke="url(#stream-grad)" strokeWidth="0.75" strokeLinecap="round" />
        <line x1="39" y1="43" x2="52" y2="43" stroke="url(#stream-grad)" strokeWidth="0.75" strokeLinecap="round" />
      </g>

      {/* Ping dot — live indicator at bottom */}
      <circle cx="32" cy="52" r="2" fill="#00e5ff" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="32" cy="52" r="2" fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity="0.4">
        <animate attributeName="r" values="2;6;2" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * SVG wordmark — "NAVSTREAM" in a styled, geometric font treatment.
 * Works at any size. Use alongside or instead of the icon.
 */
export function NavStreamTextLogo({
  height = 24,
  className,
}: {
  height?: number;
  className?: string;
}) {
  // Aspect ratio ~5.5:1
  const width = Math.round(height * 5.5);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="wm-grad" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#80f0ff" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
        <linearGradient id="wm-subtle" x1="0" y1="0" x2="220" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* NAV — bold weight */}
      <text
        x="0"
        y="29"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="28"
        letterSpacing="2"
        fill="url(#wm-grad)"
      >
        NAV
      </text>
      {/* STREAM — lighter weight, slight offset for visual separation */}
      <text
        x="73"
        y="29"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="300"
        fontSize="28"
        letterSpacing="3"
        fill="url(#wm-grad)"
      >
        STREAM
      </text>
      {/* Underline accent */}
      <line x1="0" y1="36" x2="72" y2="36" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="73" y1="36" x2="220" y2="36" stroke="#00e5ff" strokeWidth="0.5" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}

/**
 * Full logo with wordmark — used in sidebar header
 */
export function NavStreamWordmark({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div className="relative flex-shrink-0">
        <NavStreamLogo size={32} />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <NavStreamTextLogo height={16} />
          <span className="text-[9px] text-[var(--nav-text-muted)] tracking-[0.2em] uppercase mt-1">
            Command Center
          </span>
        </div>
      )}
    </div>
  );
}
