"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NavStreamLogo, NavStreamTextLogo } from "@/components/ui/logo";
import { Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Redirect to the dashboard (command map)
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="login-page"
      className="min-h-screen flex items-center justify-center bg-[var(--nav-bg-primary)] relative overflow-hidden"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--nav-cyan)] opacity-[0.03] blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--nav-magenta)] opacity-[0.03] blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Logo */}
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 8px rgba(0,229,255,0.3))",
                  "drop-shadow(0 0 16px rgba(0,229,255,0.5))",
                  "drop-shadow(0 0 8px rgba(0,229,255,0.3))",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <NavStreamLogo size={56} />
            </motion.div>

            <div className="mt-4">
              <NavStreamTextLogo height={22} />
            </div>
            <p className="mt-2 text-xs text-[var(--nav-text-muted)] tracking-[0.15em] uppercase">
              Remote Facility Command Center
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-[var(--nav-text-secondary)] uppercase tracking-wider mb-2"
              >
                Username
              </label>
              <input
                id="username"
                data-testid="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className="w-full px-4 py-3 bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] rounded-lg text-[var(--nav-text-primary)] placeholder-[var(--nav-text-muted)] focus:outline-none focus:border-[var(--nav-cyan)] focus:ring-1 focus:ring-[var(--nav-cyan)] transition-colors text-sm"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[var(--nav-text-secondary)] uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <input
                id="password"
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] rounded-lg text-[var(--nav-text-primary)] placeholder-[var(--nav-text-muted)] focus:outline-none focus:border-[var(--nav-cyan)] focus:ring-1 focus:ring-[var(--nav-cyan)] transition-colors text-sm"
                placeholder="Enter password"
              />
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-[var(--nav-red)] bg-[var(--nav-red-glow)] border border-[var(--nav-red)]/20 rounded-lg px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-medium text-sm tracking-wide transition-all duration-200 bg-[var(--nav-cyan)] text-[var(--nav-bg-primary)] hover:bg-[var(--nav-cyan-dim)] hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Decorative bottom line */}
          <div className="mt-8 flex justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-[var(--nav-cyan)] to-transparent opacity-30" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
