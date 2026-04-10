"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface Props {
  hasGoogle: boolean;
  hasGitHub: boolean;
  hasLegacy: boolean;
}

export default function LoginClient({ hasGoogle, hasGitHub, hasLegacy }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null);
  const router = useRouter();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Wrong password");
      }
    } catch {
      setError("Connection error");
    }
    setPasswordLoading(false);
  };

  const handleOAuth = async (provider: "github" | "google") => {
    setOAuthLoading(provider);
    await authClient.signIn.social({ provider, callbackURL: "/" });
  };

  const hasAnyAuth = hasGoogle || hasGitHub || hasLegacy;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-[-0.03em]">Cabinet</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to continue</p>
        </div>

        {!hasAnyAuth && (
          <p className="text-sm text-muted-foreground text-center">
            No authentication configured.
          </p>
        )}

        {/* OAuth buttons */}
        {(hasGitHub || hasGoogle) && (
          <div className="space-y-3 mb-6">
            {hasGitHub && (
              <button
                onClick={() => handleOAuth("github")}
                disabled={!!oauthLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-[14px] hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Github className="h-4 w-4" />
                {oauthLoading === "github" ? "Redirecting..." : "Continue with GitHub"}
              </button>
            )}
            {hasGoogle && (
              <button
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-[14px] hover:bg-accent transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                {oauthLoading === "google" ? "Redirecting..." : "Continue with Google"}
              </button>
            )}
          </div>
        )}

        {/* Legacy password form */}
        {hasLegacy && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={passwordLoading || !password}
              className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {passwordLoading ? "..." : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
