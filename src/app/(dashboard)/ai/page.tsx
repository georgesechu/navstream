"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  AlertTriangle,
  Wrench,
  FileText,
  Thermometer,
  ArrowRight,
  Bot,
  User,
  Cpu,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Save,
  XCircle,
  Clock,
  Shield,
  Package,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkOrderData } from "@/app/api/ai/chat/route";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  context?: { type: string; label: string };
  workOrder?: WorkOrderData | null;
  isError?: boolean;
}

interface ContextInfo {
  siteId?: string;
  siteName?: string;
  equipmentId?: string;
  equipmentName?: string;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to NavStream AI. I can help you with equipment diagnostics, thermal analysis, work order generation, and shift reports. Use the quick prompts below or type your question.",
  timestamp: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
};

function getQuickPrompts(context: ContextInfo) {
  const equipLabel = context.equipmentName || "all equipment";
  const siteLabel = context.siteName || "all sites";

  return [
    {
      icon: Thermometer,
      label: context.equipmentName
        ? `Analyze thermal for ${context.equipmentName}`
        : "Analyze thermal readings",
      prompt: context.equipmentName
        ? `Analyze thermal readings for ${context.equipmentName} at ${siteLabel}`
        : "Analyze thermal anomalies across all sites",
      accent: "amber",
    },
    {
      icon: AlertTriangle,
      label: context.siteName
        ? `Alerts for ${context.siteName}`
        : "Summarize active alerts",
      prompt: context.siteName
        ? `Summarize active alerts for ${siteLabel}`
        : "Give me a summary of all active alerts",
      accent: "red",
    },
    {
      icon: Wrench,
      label: context.equipmentName
        ? `Work order for ${context.equipmentName}`
        : "Generate work order",
      prompt: context.equipmentName
        ? `Generate a maintenance work order for ${context.equipmentName} at ${siteLabel}`
        : "Generate a maintenance work order",
      accent: "cyan",
    },
    {
      icon: FileText,
      label: "Shift handover report",
      prompt: context.siteName
        ? `Generate a shift handover report for ${siteLabel}`
        : "Generate a shift handover report for today",
      accent: "green",
    },
  ];
}

function WorkOrderCard({
  workOrder,
  onSave,
  saveStatus,
}: {
  workOrder: WorkOrderData;
  onSave: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}) {
  return (
    <div
      className="mt-3 rounded-lg border border-cyan/20 bg-[var(--nav-bg-tertiary)] overflow-hidden"
      data-testid="ai-work-order-card"
    >
      <div className="px-4 py-3 border-b border-[var(--nav-border-subtle)] bg-cyan/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan" />
            <span className="text-sm font-semibold text-[var(--nav-text-primary)]">
              Work Order
            </span>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
              workOrder.priority === "critical" &&
                "bg-red/20 text-red",
              workOrder.priority === "high" &&
                "bg-amber/20 text-amber",
              workOrder.priority === "medium" &&
                "bg-cyan/20 text-cyan",
              workOrder.priority === "low" &&
                "bg-green/20 text-green"
            )}
          >
            {workOrder.priority}
          </span>
        </div>
        <p className="text-xs text-[var(--nav-text-secondary)] mt-1">
          {workOrder.title}
        </p>
      </div>

      <div className="px-4 py-3 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[var(--nav-text-muted)]">Site</span>
            <p className="text-[var(--nav-text-primary)]">{workOrder.site}</p>
          </div>
          <div>
            <span className="text-[var(--nav-text-muted)]">Equipment</span>
            <p className="text-[var(--nav-text-primary)]">
              {workOrder.equipment}
            </p>
          </div>
          <div>
            <span className="text-[var(--nav-text-muted)]">Assignee</span>
            <p className="text-[var(--nav-text-primary)]">
              {workOrder.assignee}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--nav-text-muted)]" />
            <div>
              <span className="text-[var(--nav-text-muted)]">Due</span>
              <p className="text-[var(--nav-text-primary)]">
                {new Date(workOrder.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {workOrder.steps.length > 0 && (
          <div>
            <span className="text-[var(--nav-text-muted)] block mb-1">
              Steps ({workOrder.steps.length})
            </span>
            <ol className="list-decimal list-inside space-y-0.5">
              {workOrder.steps.map((step, i) => (
                <li
                  key={i}
                  className="text-[var(--nav-text-secondary)] text-[11px]"
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {workOrder.safetyRequirements.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Shield className="w-3 h-3 text-amber" />
              <span className="text-[var(--nav-text-muted)]">Safety</span>
            </div>
            <ul className="space-y-0.5">
              {workOrder.safetyRequirements.map((req, i) => (
                <li
                  key={i}
                  className="text-[var(--nav-text-secondary)] text-[11px]"
                >
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {workOrder.partsRequired.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Package className="w-3 h-3 text-cyan" />
              <span className="text-[var(--nav-text-muted)]">Parts</span>
            </div>
            <ul className="space-y-0.5">
              {workOrder.partsRequired.map((part, i) => (
                <li
                  key={i}
                  className="text-[var(--nav-text-secondary)] text-[11px]"
                >
                  {part}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-[var(--nav-border-subtle)]">
        <button
          onClick={onSave}
          disabled={saveStatus === "saving" || saveStatus === "saved"}
          data-testid="ai-save-work-order-btn"
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
            saveStatus === "saved"
              ? "bg-green/20 text-green border border-green/30"
              : saveStatus === "error"
                ? "bg-red/20 text-red border border-red/30 hover:bg-red/30"
                : saveStatus === "saving"
                  ? "bg-cyan/10 text-cyan border border-cyan/20"
                  : "bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 shadow-[0_0_12px_rgba(0,212,255,0.15)]"
          )}
        >
          {saveStatus === "saving" && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          {saveStatus === "saved" && <CheckCircle2 className="w-3.5 h-3.5" />}
          {saveStatus === "error" && <XCircle className="w-3.5 h-3.5" />}
          {saveStatus === "idle" && <Save className="w-3.5 h-3.5" />}
          {saveStatus === "idle" && "Save Work Order"}
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Work Order Saved"}
          {saveStatus === "error" && "Failed -- Click to Retry"}
        </button>
      </div>
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense>
      <AIPageContent />
    </Suspense>
  );
}

function AIPageContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ContextInfo>({});
  const [workOrderSaveStatus, setWorkOrderSaveStatus] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load context from URL params and fetch names
  useEffect(() => {
    const siteId = searchParams.get("site") || undefined;
    const equipmentId = searchParams.get("equipment") || undefined;

    if (!siteId && !equipmentId) return;

    const newContext: ContextInfo = { siteId, equipmentId };

    // Fetch site/equipment names if we have IDs
    if (siteId) {
      fetch(`/api/sites/${siteId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.name) {
            setContext((prev) => ({ ...prev, siteName: data.name }));
          }
          // Also look up equipment name if present
          if (equipmentId && data?.equipment) {
            const equip = data.equipment.find(
              (e: { id: string; name: string }) => e.id === equipmentId
            );
            if (equip) {
              setContext((prev) => ({
                ...prev,
                equipmentName: equip.name,
              }));
            }
          }
        })
        .catch(() => {
          // Context fetch failed — not critical
        });
    }

    setContext(newContext);
  }, [searchParams]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isLoading) return;

      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: messageText.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        context:
          context.equipmentName || context.siteName
            ? {
                type: context.equipmentName ? "equipment" : "site",
                label:
                  context.equipmentName ||
                  context.siteName ||
                  "",
              }
            : undefined,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageText.trim(),
            context: {
              siteId: context.siteId,
              equipmentId: context.equipmentId,
              siteName: context.siteName,
              equipmentName: context.equipmentName,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          workOrder: data.workOrder || null,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errorMsg: Message = {
          id: `msg-${Date.now()}-err`,
          role: "assistant",
          content: `Sorry, I encountered an error processing your request. ${err instanceof Error ? err.message : "Please try again."}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, context]
  );

  const handleSend = () => {
    sendMessage(input);
  };

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setWorkOrderSaveStatus({});
  };

  const handleSaveWorkOrder = async (
    msgId: string,
    workOrder: WorkOrderData
  ) => {
    setWorkOrderSaveStatus((prev) => ({ ...prev, [msgId]: "saving" }));

    try {
      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: workOrder.title,
          siteId: workOrder.siteId,
          equipmentId: workOrder.equipmentId,
          priority: workOrder.priority,
          assignee: workOrder.assignee,
          dueDate: workOrder.dueDate,
          steps: workOrder.steps,
          safetyRequirements: workOrder.safetyRequirements,
          partsRequired: workOrder.partsRequired,
          estimatedMinutes: workOrder.estimatedMinutes,
          description: `AI-generated: ${workOrder.title}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setWorkOrderSaveStatus((prev) => ({ ...prev, [msgId]: "saved" }));
    } catch {
      setWorkOrderSaveStatus((prev) => ({ ...prev, [msgId]: "error" }));
    }
  };

  const quickPrompts = getQuickPrompts(context);

  const contextPanelItems = [
    ...(context.siteName
      ? [
          {
            label: context.siteName,
            detail: "Active site context",
            icon: Cpu,
            accent: "text-cyan",
          },
        ]
      : []),
    ...(context.equipmentName
      ? [
          {
            label: context.equipmentName,
            detail: "Equipment context",
            icon: Wrench,
            accent: "text-amber",
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-6 h-[calc(100vh-3.5rem)]">
        <PageHeader
          title="AI Assistant"
          subtitle="Equipment-aware diagnostics, work orders & analysis"
          accent="magenta"
          actions={
            <button
              onClick={handleNewChat}
              data-testid="ai-new-chat-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border)] text-[var(--nav-text-muted)] text-xs hover:text-[var(--nav-text-secondary)] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              New Chat
            </button>
          }
        />

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Chat area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4"
              data-testid="ai-messages-container"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    data-testid={`ai-message-${msg.id}`}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-1",
                          msg.isError
                            ? "bg-red/10 border-red/20"
                            : "bg-magenta/10 border-magenta/20"
                        )}
                      >
                        {msg.isError ? (
                          <XCircle className="w-4 h-4 text-red" />
                        ) : (
                          <Bot className="w-4 h-4 text-magenta" />
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-3 text-sm",
                        msg.role === "user"
                          ? "bg-cyan/10 border border-cyan/20 text-[var(--nav-text-primary)]"
                          : msg.isError
                            ? "bg-red/5 border border-red/20 text-[var(--nav-text-secondary)]"
                            : "bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)] text-[var(--nav-text-secondary)]"
                      )}
                    >
                      {msg.context && (
                        <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[var(--nav-border-subtle)]">
                          <Cpu className="w-3 h-3 text-cyan" />
                          <span className="text-[10px] text-cyan">
                            {msg.context.label}
                          </span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                        {msg.content}
                      </div>
                      {msg.workOrder && (
                        <WorkOrderCard
                          workOrder={msg.workOrder}
                          onSave={() =>
                            handleSaveWorkOrder(msg.id, msg.workOrder!)
                          }
                          saveStatus={
                            workOrderSaveStatus[msg.id] || "idle"
                          }
                        />
                      )}
                      <div className="mt-2 text-[10px] text-[var(--nav-text-muted)]">
                        {msg.timestamp}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-cyan" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-testid="ai-typing-indicator"
                  className="flex gap-3 justify-start"
                >
                  <div className="w-8 h-8 rounded-lg bg-magenta/10 border border-magenta/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-magenta" />
                  </div>
                  <div className="rounded-xl px-4 py-3 bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-magenta animate-spin" />
                      <span className="text-xs text-[var(--nav-text-muted)]">
                        NavStream AI is thinking...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex flex-col gap-3">
              {/* Quick prompts */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickPrompts.map((prompt, i) => {
                  const accentColors: Record<string, string> = {
                    amber: "border-amber/20 text-amber hover:bg-amber/10",
                    red: "border-red/20 text-red hover:bg-red/10",
                    cyan: "border-cyan/20 text-cyan hover:bg-cyan/10",
                    green: "border-green/20 text-green hover:bg-green/10",
                  };

                  return (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt.prompt)}
                      disabled={isLoading}
                      data-testid={`ai-quick-prompt-${i}`}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-colors",
                        accentColors[prompt.accent],
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <prompt.icon className="w-3 h-3" />
                      {prompt.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-end gap-2 p-3 rounded-xl bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)]">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-magenta/10 border border-magenta/20 flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-magenta" />
                  <span className="text-[10px] font-mono text-magenta">
                    Claude
                  </span>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about equipment, diagnostics, or generate reports..."
                  data-testid="ai-chat-input"
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)] outline-none resize-none min-h-[36px] max-h-[120px] disabled:opacity-50"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  data-testid="ai-send-btn"
                  aria-label="Send message"
                  className={cn(
                    "p-2 rounded-lg transition-all flex-shrink-0",
                    input.trim() && !isLoading
                      ? "bg-magenta text-white shadow-[0_0_12px_rgba(224,64,251,0.3)] hover:bg-magenta/80"
                      : "bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)]"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Context panel */}
          <div
            className="w-72 flex flex-col gap-4 overflow-y-auto flex-shrink-0"
            data-testid="ai-context-panel"
          >
            <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1">
              Active Context
            </h2>

            <div className="space-y-3">
              {contextPanelItems.length > 0 ? (
                contextPanelItems.map((ctx, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)]"
                  >
                    <ctx.icon className={cn("w-4 h-4", ctx.accent)} />
                    <div>
                      <p className="text-xs font-medium text-[var(--nav-text-primary)]">
                        {ctx.label}
                      </p>
                      <p className="text-[10px] text-[var(--nav-text-muted)]">
                        {ctx.detail}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)]">
                  <p className="text-xs text-[var(--nav-text-muted)]">
                    No active context. Navigate from a site or equipment page to
                    provide context, or ask a general question.
                  </p>
                </div>
              )}
            </div>

            <h2 className="text-xs font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-1 mt-2">
              Capabilities
            </h2>

            <div className="space-y-2">
              {[
                "Equipment diagnostics",
                "Work order generation",
                "Thermal analysis",
                "Shift handover reports",
                "Maintenance scheduling",
                "Safety compliance checks",
                "Anomaly detection",
                "Alert summaries",
              ].map((cap, i) => (
                <motion.div
                  key={cap}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nav-bg-secondary)]"
                >
                  <ArrowRight className="w-3 h-3 text-magenta" />
                  <span className="text-[11px] text-[var(--nav-text-secondary)]">
                    {cap}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
