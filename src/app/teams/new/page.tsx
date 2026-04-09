"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { fetchUserTeams } from "@/lib/api/client";

export default function NewTeamPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setTeams = useAppStore((s) => s.setTeams);
  const setCurrentTeam = useAppStore((s) => s.setCurrentTeam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create team");
        return;
      }

      const { team } = await res.json();

      // Refresh teams list and switch to new team
      const teams = await fetchUserTeams();
      setTeams(teams);
      setCurrentTeam(team.slug);
      router.push("/");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-[-0.02em]">New team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each team has its own knowledge base and members.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Team name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering, Marketing"
              autoFocus
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-3 py-2 rounded-md border border-border text-[14px] hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
