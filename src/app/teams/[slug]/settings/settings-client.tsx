"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Trash2, UserMinus, Shield, User } from "lucide-react";
import { fetchUserTeams } from "@/lib/api/client";
import { useAppStore } from "@/stores/app-store";

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "member";
  joined_at: string;
}

interface TeamSettingsClientProps {
  slug: string;
}

export function TeamSettingsClient({ slug }: TeamSettingsClientProps) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const setTeams = useAppStore((s) => s.setTeams);
  const setCurrentTeam = useAppStore((s) => s.setCurrentTeam);

  const [team, setTeam] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  const myRole = members.find((m) => m.id === session?.user?.id)?.role;
  const isAdmin = myRole === "admin";

  useEffect(() => {
    async function load() {
      try {
        const [teamRes, membersRes] = await Promise.all([
          fetch(`/api/teams/${slug}`),
          fetch(`/api/teams/${slug}/members`),
        ]);
        if (!teamRes.ok) {
          router.push("/");
          return;
        }
        const { team: t } = await teamRes.json();
        const { members: m } = await membersRes.json();
        setTeam(t);
        setName(t.name);
        setMembers(m);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === team?.name) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/teams/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to rename");
        return;
      }
      const { team: t } = await res.json();
      setTeam(t);
      const teams = await fetchUserTeams();
      setTeams(teams);
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError("");
    try {
      const res = await fetch(`/api/teams/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Failed to add member");
        return;
      }
      setInviteEmail("");
      // Reload members
      const membersRes = await fetch(`/api/teams/${slug}/members`);
      const { members: m } = await membersRes.json();
      setMembers(m);
    } catch {
      setError("Connection error");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await fetch(`/api/teams/${slug}/members/${userId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch {
      setError("Failed to remove member");
    }
  };

  const handleChangeRole = async (userId: string, role: "admin" | "member") => {
    try {
      await fetch(`/api/teams/${slug}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role } : m));
    } catch {
      setError("Failed to change role");
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm(`Delete team "${team?.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/teams/${slug}`, { method: "DELETE" });
      const teams = await fetchUserTeams();
      setTeams(teams);
      if (teams.length > 0) setCurrentTeam(teams[0].slug);
      router.push("/");
    } catch {
      setError("Failed to delete team");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold tracking-[-0.02em]">Team settings</h1>
        </div>

        {error && (
          <p className="text-sm text-red-400 px-3 py-2 rounded-md border border-red-400/30 bg-red-400/10">
            {error}
          </p>
        )}

        {/* General */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">General</h2>
          <form onSubmit={handleRename} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            {isAdmin && (
              <button
                type="submit"
                disabled={saving || name === team?.name || !name.trim()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Rename"}
              </button>
            )}
          </form>
        </section>

        {/* Members */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Members ({members.length})</h2>
          <div className="divide-y divide-border rounded-md border border-border">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium shrink-0">
                  {(member.name ?? member.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{member.name ?? member.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  {isAdmin && member.id !== session?.user?.id && (
                    <>
                      <button
                        onClick={() =>
                          handleChangeRole(
                            member.id,
                            member.role === "admin" ? "member" : "admin"
                          )
                        }
                        title={`Change to ${member.role === "admin" ? "member" : "admin"}`}
                        className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
                      >
                        {member.role === "admin" ? (
                          <Shield className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <User className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove member"
                        className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {!isAdmin || member.id === session?.user?.id ? (
                    <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 rounded-sm bg-muted">
                      {member.role}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="px-2 py-2 rounded-md border border-border bg-background text-[14px]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {inviting ? "Adding..." : "Add"}
              </button>
            </form>
          )}
        </section>

        {/* Danger zone */}
        {isAdmin && (
          <section className="space-y-4 border border-red-400/30 rounded-md p-4">
            <h2 className="text-sm font-semibold text-red-400">Danger zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium">Delete this team</p>
                <p className="text-[12px] text-muted-foreground">
                  Permanently remove the team and all its data.
                </p>
              </div>
              <button
                onClick={handleDeleteTeam}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-400/50 text-red-400 text-[13px] hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
