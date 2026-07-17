"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { NavStreamLogo, NavStreamTextLogo } from "@/components/ui/logo";
import {
  Globe,
  Camera,
  Activity,
  BrainCircuit,
  Thermometer,
  Video,
  Bell,
  Search,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Shield,
  Users,
  TrendingDown,
  Zap,
  MapPin,
} from "lucide-react";

// ─── Animated counter ──────────────────────────────────────────────

function AnimatedStat({
  value,
  suffix,
  prefix,
  label,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isInView || !displayRef.current) return;
    const end = value;
    const duration = 1500;
    const startTime = performance.now();

    function update(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * end);
      if (displayRef.current) {
        displayRef.current.textContent = `${prefix || ""}${current.toLocaleString()}${suffix || ""}`;
      }
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }, [isInView, value, prefix, suffix]);

  return (
    <div ref={ref} className="text-center">
      <span
        ref={displayRef}
        className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan to-[#80f0ff] bg-clip-text text-transparent"
      >
        {prefix || ""}0{suffix || ""}
      </span>
      <p className="mt-1 text-sm text-[var(--nav-text-muted)]">{label}</p>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────

function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Data ─────────────────────────────────────────────────────────

const capabilities = [
  {
    icon: Globe,
    title: "Command Map",
    desc: "Real-time global view of all facilities with live status, personnel tracking, and one-click site access.",
    accent: "cyan",
  },
  {
    icon: Camera,
    title: "360° Immersive",
    desc: "Navigate facility interiors with panoramic views, interactive hotspots, and scene-to-scene walkthroughs.",
    accent: "magenta",
  },
  {
    icon: Activity,
    title: "Live Sensors",
    desc: "Real-time sensor feeds with anomaly detection, threshold alerts, and historical trend analysis.",
    accent: "green",
  },
  {
    icon: BrainCircuit,
    title: "AI Diagnostics",
    desc: "Intelligent analysis of equipment health with automated work order generation and confidence scoring.",
    accent: "magenta",
  },
  {
    icon: Thermometer,
    title: "Thermal Imaging",
    desc: "Infrared overlays with per-pixel temperature readout, hotspot detection, and baseline comparison.",
    accent: "amber",
  },
  {
    icon: Video,
    title: "Video Comms",
    desc: "WebRTC video calls with AR annotations, shared camera views, and guided repair checklists.",
    accent: "green",
  },
];

const accentMap: Record<string, string> = {
  cyan: "text-[var(--nav-cyan)]",
  green: "text-[var(--nav-green)]",
  amber: "text-[var(--nav-amber)]",
  magenta: "text-[var(--nav-magenta)]",
};

const accentBg: Record<string, string> = {
  cyan: "bg-[var(--nav-cyan-glow)]",
  green: "bg-[var(--nav-green-glow)]",
  amber: "bg-[var(--nav-amber-glow)]",
  magenta: "bg-[var(--nav-magenta-glow)]",
};

const workflow = [
  {
    icon: Bell,
    title: "Detect",
    desc: "Sensors flag an anomaly. The right people know instantly.",
  },
  {
    icon: Search,
    title: "Diagnose",
    desc: "Live feeds, thermal data, and AI narrow the cause — remotely.",
  },
  {
    icon: Video,
    title: "Connect",
    desc: "Video call with on-site personnel. Share what you both see.",
  },
  {
    icon: Wrench,
    title: "Resolve",
    desc: "Guided checklist, photo proof, auto-generated work order.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div data-testid="landing-page" className="min-h-screen bg-[var(--nav-bg-primary)] relative">
      {/* Background */}
      <div className="fixed inset-0 grid-pattern opacity-[0.06] pointer-events-none" />

      {/* ─── NAV BAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--nav-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--nav-border)]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NavStreamLogo size={28} />
            <NavStreamTextLogo height={14} />
          </div>
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-lg text-xs font-semibold tracking-wide bg-[var(--nav-cyan)] text-[var(--nav-bg-primary)] hover:bg-[var(--nav-cyan-dim)] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <header className="relative pt-32 pb-20 md:pt-44 md:pb-28 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[var(--nav-cyan)] opacity-[0.04] blur-[120px]" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                animate={{
                  filter: [
                    "drop-shadow(0 0 8px rgba(0,229,255,0.2))",
                    "drop-shadow(0 0 20px rgba(0,229,255,0.4))",
                    "drop-shadow(0 0 8px rgba(0,229,255,0.2))",
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <NavStreamLogo size={56} />
              </motion.div>
              <NavStreamTextLogo height={28} />
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-[var(--nav-text-primary)] leading-tight max-w-3xl">
              Remote operations,{" "}
              <span className="bg-gradient-to-r from-cyan to-[#80f0ff] bg-clip-text text-transparent">
                without the travel.
              </span>
            </h1>

            <p className="mt-5 text-base md:text-lg text-[var(--nav-text-secondary)] max-w-2xl leading-relaxed">
              NavStream gives back-office engineers full interactive visibility into remote facilities — live cameras, 360° walkthroughs, real-time sensors, thermal imaging, and AI diagnostics — so problems get solved without sending someone on a plane.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 px-7 py-3 rounded-lg font-semibold text-sm bg-[var(--nav-cyan)] text-[var(--nav-bg-primary)] hover:bg-[var(--nav-cyan-dim)] hover:shadow-[0_0_24px_rgba(0,229,255,0.25)] transition-all"
              >
                Open Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <span className="text-xs text-[var(--nav-text-muted)] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Deployed &amp; running on your infrastructure
              </span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ─── STATS STRIP ─── */}
      <Section className="border-y border-[var(--nav-border)] bg-[var(--nav-bg-secondary)]/50">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <AnimatedStat value={99} suffix="%" label="Average uptime" />
          <AnimatedStat value={6} label="Facilities monitored" />
          <AnimatedStat value={180} prefix="$" suffix="K" label="Saved this quarter" />
          <AnimatedStat value={23} label="Remote resolutions" />
        </div>
      </Section>

      {/* ─── CAPABILITIES ─── */}
      <Section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-[var(--nav-cyan)] uppercase tracking-[0.2em] mb-2">
            Platform
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--nav-text-primary)]">
            Everything you need to operate remotely
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="group p-5 rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] hover:border-[var(--nav-bg-hover)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all"
            >
              <div
                className={`w-10 h-10 rounded-lg ${accentBg[cap.accent]} flex items-center justify-center mb-4`}
              >
                <cap.icon className={`w-5 h-5 ${accentMap[cap.accent]}`} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--nav-text-primary)] mb-1.5">
                {cap.title}
              </h3>
              <p className="text-xs text-[var(--nav-text-muted)] leading-relaxed">
                {cap.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ─── HOW IT WORKS ─── */}
      <Section className="bg-[var(--nav-bg-secondary)]/30 border-y border-[var(--nav-border)]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[var(--nav-green)] uppercase tracking-[0.2em] mb-2">
              Workflow
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--nav-text-primary)]">
              From alert to resolution in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {workflow.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="relative text-center"
              >
                {/* Connector line */}
                {i < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-[var(--nav-border)] to-transparent" />
                )}
                <div className="w-14 h-14 rounded-xl bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)] flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-[var(--nav-cyan)]" />
                </div>
                <div className="text-[10px] font-bold text-[var(--nav-cyan)] uppercase tracking-widest mb-1">
                  Step {i + 1}
                </div>
                <h3 className="text-sm font-semibold text-[var(--nav-text-primary)] mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-[var(--nav-text-muted)] leading-relaxed max-w-[200px] mx-auto">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── VALUE PROP ─── */}
      <Section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold text-[var(--nav-amber)] uppercase tracking-[0.2em] mb-3">
              Impact
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--nav-text-primary)] mb-5">
              Every remote resolution is a trip you didn&apos;t take
            </h2>
            <p className="text-sm text-[var(--nav-text-secondary)] leading-relaxed mb-6">
              Each engineer dispatch costs $5,000–$15,000 in flights, accommodation, and downtime. NavStream turns most of those into 15-minute remote sessions.
            </p>
            <div className="space-y-3">
              {[
                { icon: TrendingDown, text: "60% reduction in on-site dispatch", color: "text-green" },
                { icon: Zap, text: "12 minutes average time to diagnosis", color: "text-cyan" },
                { icon: Users, text: "Any smartphone becomes a field camera", color: "text-magenta" },
                { icon: MapPin, text: "Manage 6+ facilities from one screen", color: "text-amber" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                  <span className="text-sm text-[var(--nav-text-secondary)]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "$180K", sub: "saved this quarter", accent: "border-green/20 bg-green/5" },
              { value: "23", sub: "remote resolutions", accent: "border-cyan/20 bg-cyan/5" },
              { value: "99.2%", sub: "system uptime", accent: "border-amber/20 bg-amber/5" },
              { value: "< 15min", sub: "avg diagnosis time", accent: "border-magenta/20 bg-magenta/5" },
            ].map((stat) => (
              <div
                key={stat.sub}
                className={`p-5 rounded-xl border ${stat.accent} text-center`}
              >
                <p className="text-2xl font-bold font-mono text-[var(--nav-text-primary)]">
                  {stat.value}
                </p>
                <p className="text-[10px] text-[var(--nav-text-muted)] uppercase tracking-wider mt-1">
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── CTA ─── */}
      <Section className="border-t border-[var(--nav-border)]">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <NavStreamLogo size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--nav-text-primary)] mb-3">
            Ready to see it in action?
          </h2>
          <p className="text-sm text-[var(--nav-text-muted)] mb-8">
            The demo is seeded with realistic facility data — 6 sites, live sensors, thermal imaging, and AI diagnostics.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-sm bg-[var(--nav-cyan)] text-[var(--nav-bg-primary)] hover:bg-[var(--nav-cyan-dim)] hover:shadow-[0_0_24px_rgba(0,229,255,0.25)] transition-all"
          >
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[var(--nav-border)] bg-[var(--nav-bg-secondary)]/30">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <NavStreamLogo size={20} />
            <NavStreamTextLogo height={10} />
          </div>
          <p className="text-[11px] text-[var(--nav-text-muted)]">
            &copy; {new Date().getFullYear()} NavStream. Built for remote operations.
          </p>
        </div>
      </footer>
    </div>
  );
}
