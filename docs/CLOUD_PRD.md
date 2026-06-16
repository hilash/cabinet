# Cabinet Cloud — PRD

**Status:** Draft v1 (2026-06-10)
**Goal:** Hosted Cabinet at `<org>.app.runcabinet.com` — fast public demo + payments, per-org secure environments, org membership + invites.

---

## 1. What we learned from the codebase (changes everything)

Cabinet is **already a web app**, not an Electron-only app:

- `npm run start` = `next start` + `tsx server/cabinet-daemon.ts`. Electron (`electron/main.cjs`) is a thin shell: window, whisper dictation, menus, auto-update.
- `cabinet-daemon.ts` owns the runtime: PTY/WebSocket terminal server for agent sessions, node-cron job scheduler, WebSocket event bus, SQLite (better-sqlite3), chokidar file watcher over `data/`.
- Agent sessions are **provider CLI subprocesses** (Claude Code etc., see `server/pty/claude-lifecycle.ts`, `docs/PROVIDER-CLI.md`). The cloud image must bundle the provider CLIs, and each org container needs an API key at runtime.
- Rooms-v3 isolation means an org's entire state is one directory tree (`data/` home + sibling room cabinets) → **org = one filesystem = one volume**. No data-model work needed.

**Therefore: the cloud unit is one container running `next start + daemon` over one volume.** No Electron-main extraction project. The new work is everything *around* that container.

### What does NOT port (v1 cuts)
- Whisper dictation (Electron-native smart-whisper) → hide mic button in cloud builds (env flag `CABINET_CLOUD=1`).
- Auto-update, native menus, local-folder symlink/import flows that assume the user's host filesystem.
- Local AI-CLI detection/onboarding steps that scan the host machine.

---

## 2. Product model

### Tenancy
- **Org = tenant = one container + one volume.** An org's volume is today's `data/` tree (home + rooms).
- **User = identity with memberships.** Signup auto-creates a personal org (slug = handle). Users can belong to many orgs.
- **URL:** `<org-slug>.app.runcabinet.com`. Wildcard DNS + router maps subdomain → org container, waking it if stopped.

### Membership & invites (v1)
- Roles: `owner | admin | member` — org-wide. **No per-room ACLs in v1.**
- Invite flow: owner enters email → invite row + token link → invitee signs up/logs in → membership created → org appears in their org switcher.
- **Two-level switcher:** new org switcher (control plane) above the existing room switcher (unchanged).

### Collaboration (v1 — decided)
**Shared workspace, non-realtime.** Members share the org filesystem; the existing WebSocket event bus + chokidar already push file-change events to connected clients, so much of "refresh-to-see-changes" comes free. Last-write-wins; soft lock on open editors if cheap. No presence, no CRDT in v1.

### Inference (decided: hybrid)
- **Trial:** bundled allowance per new org (suggest **$5 of tokens or 30 agent-runs, whichever first**) using a pooled key, hard-capped by a per-org meter in the daemon (count tokens from CLI session output; kill switch at cap).
- **After trial:** org enters its own Anthropic key in Settings (stored encrypted in the org's own volume — never in the control plane), or upgrades to a paid plan that includes a monthly capped allowance.
- Pricing must assume infra is the *small* number; bundled-inference tiers must price tokens with margin.

---

## 3. Architecture

### Control plane (new, small)
- **Firebase Auth** — Google + email/password login. Org containers verify Firebase ID tokens statelessly (Google public certs) → no shared session store, works from any cloud.
- **Firestore** — collections: `users`, `orgs`, `memberships`, `invites`, `trialMeters`. (Stripe customer/sub IDs on `orgs`.)
- **Cloud Functions (or tiny Cloud Run service)** — Stripe webhooks, invite emails, org provisioning calls, idle-reaper.
- **Stripe** — Checkout + customer portal. Per-seat per-org billing. `checkout.session.completed` → provision org; `customer.subscription.deleted` → stop container, retain volume 30 days, then delete.

### Data plane
One Docker image (Node 22 + Next standalone build + daemon + provider CLIs preinstalled). Per org: one container instance + one persistent volume mounted at the org's `data/` root.

Auth handshake: router/edge validates Firebase ID token → forwards with header → daemon middleware checks `(user, org)` membership via a short-lived signed claim (JWT minted by control plane, cached client-side) → role enforced in daemon + Next API routes. Org containers never query Firestore directly on the hot path.

### Routing & wake
- Wildcard DNS `*.app.runcabinet.com` → router.
- Phase 1: **Traefik** on the VM, Docker provider, label-based per-org routing; an "on-demand" middleware starts stopped containers (traefik-ondemand / sablier) → cold-start ≈ container boot (~2-5 s).
- Phase 2: cloud-native equivalent (see §5).
- Idle reaper: daemon exposes `last-activity`; reaper stops org containers idle > 30 min (cron jobs scheduled inside a stopped org don't run — v1 accepts this for free/demo orgs; paid plans can opt into always-on).

### SQLite over network storage — known risk
better-sqlite3 + WAL **does not work on NFS-style mounts** (EFS/Filestore/Azure Files). Mitigations, in preference order:
1. Phase 1 uses **local Docker volumes** (block storage) — no issue.
2. Phase 2 on AWS/EFS: single-writer per org (true by design) + `journal_mode=DELETE` (or `TRUNCATE`) when `CABINET_CLOUD=1`; OR keep SQLite on container scratch disk and treat it as a rebuildable index/state cache if audit confirms `server/db.ts` contents are derivable from the `data/` tree (**open question O1**).

---

## 4. Phases

### Phase 1 — Public demo + payments (target: ~1-2 weeks)
One VM, shared-kernel isolation (acceptable for demo/free tier).

- [ ] Cloud build flag: `CABINET_CLOUD=1` (hide dictation/Electron-only UI, lock `DATA_DIR`, disable host-FS features)
- [ ] Dockerfile: Next standalone + daemon + provider CLIs; healthcheck
- [ ] GCE VM (e2-standard-4) + Docker + Traefik + wildcard cert (Let's Encrypt DNS-01)
- [ ] Firebase Auth + Firestore control plane; login page; personal-org auto-create
- [ ] Provisioner: create org → docker volume + container with labels; idle reaper
- [ ] Org switcher UI (list memberships, jump subdomains)
- [ ] Invites (email link via Resend or Firebase ext)
- [ ] Stripe Checkout + webhook → provision/suspend
- [ ] Trial token meter + cap in daemon; BYO-key settings UI
- [ ] Landing/waitlist → signup funnel (reuse cabinet-backend waitlist)

### Phase 2 — Hardened isolation for paid orgs (after demo traction)
- Migrate paid orgs to microVM-isolated runtime: **AWS Fargate task per org + EFS access point per org** (uses AWS credits), or stay GCP with GKE Autopilot pod-per-org + PD. Decision deferred to traction + credit balance (**O2**).
- ALB/host-header (or small router service) replaces Traefik; reaper via scheduled function.
- Backups: nightly volume snapshot per org.

### Phase 3 — Later
Per-room ACLs inside orgs · presence → real-time co-editing (Tiptap+Yjs) · org-to-org sharing · always-on plans (cron jobs while away) · region selection.

---

## 5. Cost model (per org per month, ballpark — verify live prices)

Sizing: active org ≈ 0.5 vCPU / 1 GB (one CLI session; bursty), 3 GB storage. "Idle-heavy" = ~10% duty cycle with scale-to-zero/stop-on-idle.

### Phase 1 (shared VM — all clouds equivalent)
| Item | Cost |
|---|---|
| VM 4 vCPU/16 GB (GCE e2-standard-4 / EC2 t3.xlarge / Azure B4ms) | ~$97-150/mo total |
| Capacity | ~25-50 mostly-idle demo orgs |
| **Per org** | **~$2-4 → $0 with credits** |
| Control plane (Firebase Spark + Stripe) | ~$0 |

### Phase 2 (per-org isolated)
| | AWS (Fargate + EFS) | GCP (GKE Autopilot + PD) | Azure (Container Apps + Files) |
|---|---|---|---|
| Active compute, 0.5 vCPU/1 GB | ~$0.025/hr | ~$0.027/hr | ~$0.054/hr (free grant offsets first ~100 h/mo) |
| Idle-heavy org | **~$2.50-3** | ~$2.30-3 | **~$1-3** |
| Daily-active org (8 h/day) | ~$7 | ~$8 | ~$10-13 |
| Always-on org | ~$19 | ~$20 | ~$35-40 |
| Storage (3 GB) | $0.90 (EFS) | $0.30 (PD) | $0.20-0.50 |
| Scale-to-zero | Build it (reaper + wake) | Build it | **Native (HTTP scale rule)** |
| Isolation | **microVM (Firecracker)** | pod/namespace (gVisor opt) | sandboxed container |
| SQLite risk | NFS — needs §3 mitigation | PD block — none | SMB — worst |
| Fixed: LB/router | ~$20 ALB | ~$20 LB (or skip via router svc) | included-ish |
| Ops burden | Low-med | **Highest** (K8s) | Lowest |

**Read:** AWS wins paid-tier isolation + your AWS credits; Azure is cheapest at idle but worst SQLite story and no credits; GKE is the most ops for no advantage. Per-**user** cost falls further with multi-seat orgs (one container serves the whole org).

### The number that actually matters
Inference. A bundled-allowance org can burn its month of hosting cost in **one afternoon** of agent runs. Trial cap + BYO-key default is what makes the model safe.

---

## 6. Open questions
- **O1:** Is `server/db.ts` SQLite fully rebuildable from the `data/` tree? (Determines EFS strategy.)
- **O2:** Phase 2 runtime — AWS Fargate vs stay-GCP. Decide on traction + remaining credits.
- **O3:** Trial cap mechanics — token counting from CLI output vs run-count cap (simpler).
- **O4:** Pooled trial key risk — rate-limit + prompt-injection exfil of the pooled key from inside org containers; likely needs a key-proxy rather than env injection.
- **O5:** Pricing tiers (seats? always-on add-on? bundled-token tier price).
