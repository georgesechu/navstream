"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { GlowCard } from "@/components/ui/glow-card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Video,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Monitor,
  Camera,
  Pencil,
  MapPin,
  MessageCircle,
  PlayCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Circle,
  Users,
  Wrench,
  Loader2,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
} from "lucide-react";
import { Suspense, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTeam, type CommsContact } from "@/hooks/use-team";
import { useWorkOrders } from "@/hooks/use-work-orders";
import { useFetch } from "@/hooks/use-fetch";

/** Minimal equipment shape returned by /api/equipment/[id]. */
interface EquipmentContext {
  id: string;
  name: string;
  category: string;
  status: string;
  siteId: string;
  location: string | null;
}

export default function CommsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <Loader2 className="w-8 h-8 text-[var(--nav-text-muted)] animate-spin" />
        </div>
      </AppShell>
    }>
      <CommsPageContent />
    </Suspense>
  );
}

function CommsPageContent() {
  const searchParams = useSearchParams();
  const siteIdParam = searchParams.get("site") || null;
  const equipmentIdParam = searchParams.get("equipment") || null;

  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [activeTab, setActiveTab] = useState<"contacts" | "sessions">(
    "contacts"
  );
  const [activeContact, setActiveContact] = useState<CommsContact | null>(null);

  // Fetch contacts and sessions from API
  const { contacts, onlineCount, siteTeamCount, isLoading: contactsLoading } =
    useTeam(siteIdParam);
  const { sessions, getWorkOrder, toggleStep, isLoading: sessionsLoading } = useWorkOrders();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Fetch equipment context if provided
  const equipmentUrl = equipmentIdParam
    ? `/api/equipment/${equipmentIdParam}`
    : null;
  const { data: equipmentContext } = useFetch<EquipmentContext>(
    equipmentUrl ?? "/api/equipment/__none__"
  );
  const showEquipmentContext = equipmentIdParam && equipmentContext && !("error" in equipmentContext);

  const handleStartCall = useCallback(
    (contact: CommsContact) => {
      setActiveContact(contact);
      setInCall(true);
    },
    []
  );

  const handleEndCall = useCallback(() => {
    setInCall(false);
    setActiveContact(null);
  }, []);

  const handleQuickCall = useCallback(() => {
    if (!inCall) {
      // Start call with first online contact, or first contact
      const target =
        contacts.find((c) => c.status === "online") ?? contacts[0] ?? null;
      if (target) {
        setActiveContact(target);
      }
      setInCall(true);
    } else {
      handleEndCall();
    }
  }, [inCall, contacts, handleEndCall]);

  // Split contacts into site team and others when site filter is active
  const { siteContacts, otherContacts } = useMemo(() => {
    if (!siteIdParam) return { siteContacts: [] as CommsContact[], otherContacts: contacts };
    return {
      siteContacts: contacts.filter((c) => c.siteId === siteIdParam),
      otherContacts: contacts.filter((c) => c.siteId !== siteIdParam),
    };
  }, [contacts, siteIdParam]);

  const callerInitials = activeContact?.avatar ?? "JM";
  const callerName = activeContact?.name ?? "James Mitchell";
  const callerDetail = activeContact
    ? `${activeContact.site} · ${activeContact.roleDisplay}`
    : "Kalgoorlie Gold Mine · Field Technician";

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-6 h-[calc(100vh-3.5rem)]">
        <PageHeader
          title="Communications"
          subtitle="Live calls, guided sessions & collaboration"
          accent="green"
        />

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Main call area */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Equipment context card */}
            {showEquipmentContext && !inCall && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan/20 bg-cyan/5"
              >
                <div className="p-2 rounded-lg bg-cyan/10 text-cyan">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--nav-text-primary)]">
                    {equipmentContext.name}
                  </p>
                  <p className="text-[10px] text-[var(--nav-text-muted)]">
                    {equipmentContext.category} · {equipmentContext.status}
                    {equipmentContext.location && ` · ${equipmentContext.location}`}
                  </p>
                </div>
                <span className="text-[10px] text-cyan font-mono">
                  Equipment Context
                </span>
              </motion.div>
            )}

            {/* Video call area */}
            <div className="flex-1 relative rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-primary)] overflow-hidden min-h-[300px]">
              {inCall ? (
                <>
                  {/* Remote video (full area) */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#0a1225]">
                    <div className="absolute inset-0 grid-pattern opacity-10" />
                    {/* Simulated video of technician */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green/20 to-cyan/20 border border-green/20 flex items-center justify-center">
                        <span className="text-4xl font-bold text-green/60">
                          {callerInitials}
                        </span>
                      </div>
                    </div>
                    {/* Name overlay */}
                    <div className="absolute bottom-16 left-4 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-primary)]/60 backdrop-blur">
                      <p className="text-sm font-medium text-white">
                        {callerName}
                      </p>
                      <p className="text-[10px] text-[var(--nav-text-muted)]">
                        {callerDetail}
                      </p>
                    </div>

                    {/* Equipment context during call */}
                    {showEquipmentContext && (
                      <div className="absolute top-4 right-56 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-primary)]/60 backdrop-blur border border-cyan/20">
                        <Wrench className="w-3 h-3 text-cyan" />
                        <span className="text-[10px] text-cyan font-mono">
                          {equipmentContext.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Local video (PiP) */}
                  <div className="absolute top-4 right-4 w-48 h-36 rounded-xl bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)] overflow-hidden shadow-[var(--nav-shadow-lg)]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-dim to-magenta flex items-center justify-center">
                        <span className="text-lg font-bold text-white">G</span>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 text-[10px] text-[var(--nav-text-muted)]">
                      You
                    </div>
                  </div>

                  {/* Call duration */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-primary)]/60 backdrop-blur border border-[var(--nav-border)]">
                    <div className="w-2 h-2 rounded-full bg-green status-online" />
                    <span className="text-xs font-mono text-green">
                      12:34
                    </span>
                  </div>

                  {/* Annotation tools */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1.5 rounded-xl bg-[var(--nav-bg-primary)]/60 backdrop-blur border border-[var(--nav-border)]">
                    {[Pencil, Circle, MapPin, MessageCircle].map(
                      (Icon, i) => (
                        <button
                          key={i}
                          className="p-2 rounded-lg text-[var(--nav-text-muted)] hover:text-white hover:bg-[var(--nav-bg-hover)] transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </>
              ) : (
                /* No active call */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center">
                    <Video className="w-10 h-10 text-green" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--nav-text-secondary)]">
                      No Active Call
                    </p>
                    <p className="text-xs text-[var(--nav-text-muted)] mt-1">
                      Select a contact to start a call or join a guided session
                    </p>
                  </div>
                </div>
              )}

              {/* Call controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--nav-bg-primary)]/80 backdrop-blur border border-[var(--nav-border)]">
                <button
                  onClick={() => setMicOn(!micOn)}
                  data-testid="comms-mic-btn"
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  aria-pressed={micOn}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    micOn
                      ? "text-white bg-[var(--nav-bg-hover)]"
                      : "text-red bg-red/10 border border-red/20"
                  )}
                >
                  {micOn ? (
                    <Mic className="w-4.5 h-4.5" />
                  ) : (
                    <MicOff className="w-4.5 h-4.5" />
                  )}
                </button>
                <button
                  onClick={() => setCameraOn(!cameraOn)}
                  data-testid="comms-camera-btn"
                  aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
                  aria-pressed={cameraOn}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    cameraOn
                      ? "text-white bg-[var(--nav-bg-hover)]"
                      : "text-red bg-red/10 border border-red/20"
                  )}
                >
                  <Camera className="w-4.5 h-4.5" />
                </button>
                <button data-testid="comms-screenshare-btn" aria-label="Share screen" className="p-2.5 rounded-xl text-white bg-[var(--nav-bg-hover)] hover:bg-[var(--nav-bg-tertiary)] transition-colors">
                  <Monitor className="w-4.5 h-4.5" />
                </button>
                <div className="w-px h-6 bg-[var(--nav-border)]" />
                {inCall ? (
                  <button
                    onClick={handleEndCall}
                    data-testid="comms-hangup-btn"
                    aria-label="End call"
                    className="p-2.5 rounded-xl text-white bg-red hover:bg-red/80 transition-colors shadow-[0_0_12px_rgba(255,23,68,0.3)]"
                  >
                    <PhoneOff className="w-4.5 h-4.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleQuickCall}
                    data-testid="comms-call-btn"
                    aria-label="Start call"
                    className="p-2.5 rounded-xl text-white bg-green hover:bg-green/80 transition-colors shadow-[0_0_12px_rgba(0,230,118,0.3)]"
                  >
                    <Phone className="w-4.5 h-4.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-80 flex flex-col gap-3 overflow-y-auto flex-shrink-0">
            {/* Tabs */}
            <div className="flex rounded-lg border border-[var(--nav-border)] overflow-hidden">
              <button
                onClick={() => setActiveTab("contacts")}
                data-testid="comms-tab-contacts"
                aria-pressed={activeTab === "contacts"}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                  activeTab === "contacts"
                    ? "bg-green/10 text-green"
                    : "text-[var(--nav-text-muted)] hover:bg-[var(--nav-bg-hover)]"
                )}
              >
                <Users className="w-3.5 h-3.5 inline mr-1.5" />
                Contacts ({onlineCount})
              </button>
              <button
                onClick={() => setActiveTab("sessions")}
                data-testid="comms-tab-sessions"
                aria-pressed={activeTab === "sessions"}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                  activeTab === "sessions"
                    ? "bg-green/10 text-green"
                    : "text-[var(--nav-text-muted)] hover:bg-[var(--nav-bg-hover)]"
                )}
              >
                <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                Sessions
              </button>
            </div>

            {activeTab === "contacts" ? (
              <div className="flex flex-col gap-2">
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-[var(--nav-text-muted)] animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Site team section header */}
                    {siteIdParam && siteContacts.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 px-1 pt-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-green">
                            Site Team ({siteContacts.length})
                          </span>
                          <div className="flex-1 h-px bg-green/20" />
                        </div>
                        {siteContacts.map((contact, i) => (
                          <ContactCard
                            key={contact.id}
                            contact={contact}
                            index={i}
                            onCall={handleStartCall}
                          />
                        ))}
                        {otherContacts.length > 0 && (
                          <div className="flex items-center gap-2 px-1 pt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--nav-text-muted)]">
                              Other Contacts ({otherContacts.length})
                            </span>
                            <div className="flex-1 h-px bg-[var(--nav-border)]" />
                          </div>
                        )}
                        {otherContacts.map((contact, i) => (
                          <ContactCard
                            key={contact.id}
                            contact={contact}
                            index={siteContacts.length + i}
                            onCall={handleStartCall}
                          />
                        ))}
                      </>
                    )}

                    {/* No site filter — flat list */}
                    {(!siteIdParam || siteContacts.length === 0) &&
                      contacts.map((contact, i) => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          index={i}
                          onCall={handleStartCall}
                        />
                      ))}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-[var(--nav-text-muted)] animate-spin" />
                  </div>
                ) : (
                  sessions.map((session, i) => {
                    const statusStyles = {
                      completed: { icon: CheckCircle2, color: "text-green", bg: "bg-green/10" },
                      active: { icon: PlayCircle, color: "text-amber", bg: "bg-amber/10" },
                      scheduled: { icon: Clock, color: "text-cyan", bg: "bg-cyan/10" },
                    };
                    const style = statusStyles[session.status];
                    const isExpanded = expandedSession === session.id;
                    const wo = isExpanded ? getWorkOrder(session.id) : null;
                    const woSteps = wo?.steps ?? [];

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <GlowCard accent="green" delay={i * 0.05}>
                          <button
                            className="w-full text-left p-3"
                            onClick={() =>
                              setExpandedSession(
                                isExpanded ? null : session.id
                              )
                            }
                            data-testid={`comms-session-card-${session.id}`}
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={cn(
                                  "p-1 rounded",
                                  style.bg,
                                  style.color
                                )}
                              >
                                <style.icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--nav-text-primary)]">
                                  {session.title}
                                </p>
                                <p className="text-[10px] text-[var(--nav-text-muted)]">
                                  {session.site}
                                  {session.equipmentName && ` · ${session.equipmentName}`}
                                </p>
                              </div>
                              {session.steps > 0 && (
                                isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-[var(--nav-text-muted)] flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-[var(--nav-text-muted)] flex-shrink-0" />
                                )
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[var(--nav-text-muted)]">
                                {session.date}
                              </span>
                              <span className={style.color}>
                                {session.duration}
                              </span>
                            </div>
                            {/* Assignee */}
                            {session.assigneeName && (
                              <div className="mt-1.5 text-[10px] text-[var(--nav-text-muted)]">
                                Assigned to {session.assigneeName}
                              </div>
                            )}
                            {/* Progress */}
                            {session.steps > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full bg-[var(--nav-bg-hover)] overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-green"
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${(session.completed / session.steps) * 100}%`,
                                    }}
                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
                                  {session.completed}/{session.steps}
                                </span>
                              </div>
                            )}
                          </button>

                          {/* Expanded steps */}
                          {isExpanded && woSteps.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-[var(--nav-border-subtle)]"
                              data-testid={`comms-session-steps-${session.id}`}
                            >
                              <div className="p-3 space-y-1.5">
                                {woSteps.map((step) => (
                                  <label
                                    key={step.order}
                                    className={cn(
                                      "flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                                      step.completed
                                        ? "bg-green/5"
                                        : "hover:bg-[var(--nav-bg-hover)]"
                                    )}
                                    data-testid={`comms-session-step-${session.id}-${step.order}`}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleStep(
                                          session.id,
                                          step.order,
                                          !step.completed
                                        );
                                      }}
                                      className="flex-shrink-0 mt-0.5"
                                      aria-label={`${step.completed ? "Uncheck" : "Check"} step ${step.order}`}
                                      data-testid={`comms-session-step-check-${session.id}-${step.order}`}
                                    >
                                      {step.completed ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-green" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-[var(--nav-text-muted)]" />
                                      )}
                                    </button>
                                    <span
                                      className={cn(
                                        "text-[11px] leading-relaxed",
                                        step.completed
                                          ? "text-[var(--nav-text-muted)] line-through"
                                          : "text-[var(--nav-text-secondary)]"
                                      )}
                                    >
                                      {step.description}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </GlowCard>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/** Contact card extracted as a component for reuse in sectioned lists. */
function ContactCard({
  contact,
  index,
  onCall,
}: {
  contact: CommsContact;
  index: number;
  onCall: (contact: CommsContact) => void;
}) {
  const statusColor =
    contact.status === "online"
      ? "bg-green"
      : contact.status === "warning"
        ? "bg-amber"
        : "bg-[var(--nav-text-muted)]";

  return (
    <motion.button
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onCall(contact)}
      data-testid={`comms-contact-${contact.id}`}
      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] hover:bg-[var(--nav-bg-tertiary)] hover:border-green/20 transition-all text-left group"
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-dim/30 to-magenta/30 flex items-center justify-center border border-[var(--nav-border)]">
          <span className="text-sm font-semibold text-[var(--nav-text-primary)]">
            {contact.avatar}
          </span>
        </div>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--nav-bg-secondary)]",
            statusColor
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--nav-text-primary)] group-hover:text-green transition-colors">
          {contact.name}
        </p>
        <p className="text-[10px] text-[var(--nav-text-muted)] truncate">
          {contact.roleDisplay} · {contact.site}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1.5 rounded-lg bg-green/10 text-green">
          <Video className="w-3.5 h-3.5" />
        </div>
        <div className="p-1.5 rounded-lg bg-cyan/10 text-cyan">
          <Phone className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.button>
  );
}
