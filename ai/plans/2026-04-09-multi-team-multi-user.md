# Multi-Team & Multi-User Support

**Data de execução:** 2026-04-09  
**Branch:** `main`  
**Repo upstream:** `https://github.com/hilash/cabinet`  
**Status:** Implementado, TypeScript limpo, testado em desenvolvimento com OAuth Google

---

## Contexto

O Cabinet é uma base de conhecimento single-tenant: uma senha compartilhada (`KB_PASSWORD`) protege toda a instância e todos os usuários veem e editam o mesmo conjunto de dados. O objetivo desta feature é transformá-lo em multi-tenant com:

1. **Autenticação OAuth** (Google + GitHub) como mecanismo principal, com fallback legado por senha
2. **Times com controle de acesso** — cada time tem sua própria KB; usuários precisam ser membros para acessá-la
3. **Isolamento de KB por time** — cada time tem seu próprio diretório de dados e repositório git independente
4. **Isolamento de sessões de AI por usuário** — sessões PTY do daemon tagueadas por `userId`; workspaces separados por usuário

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Auth | OAuth (Google + GitHub) via **better-auth** | Compatível com Next.js 16 + Turbopack; API estável e mantida ativamente |
| Biblioteca auth | `better-auth` (não `next-auth@5 beta`) | `next-auth@5.0.0-beta.30` é incompatível com Next.js 16 + Turbopack: falha ao resolver `next/server` via ESM |
| Sessões auth | Database sessions gerenciadas pelo better-auth | Tabelas `user`, `account`, `session`, `verification` criadas automaticamente via migration |
| Middleware | `betterFetch` ao endpoint `/api/auth/get-session` | Evita importar `better-sqlite3` (Node.js nativo) no Edge Runtime do middleware |
| Isolamento de KB | Pasta + git repo por time | Máximo isolamento; git history separado por time |
| Isolamento de agentes | Workspace por usuário dentro do time | Sem conflito de sessões PTY; sem custo de processo extra |
| Migração | Time "default" com `data_dir_override` | Zero movimentação de arquivos; backward compat total |
| Detecção Electron | `useEffect` em client component | React 19 não executa `<script>` dentro de componentes React; `useEffect` é a alternativa correta |
| `onSelect` → `onClick` | `onClick` padrão do React | `onSelect` é API exclusiva do Radix UI; o projeto usa base-ui que ignora `onSelect` silenciosamente |

---

## Histórico de Decisão: Por que better-auth em vez de next-auth?

### Tentativa inicial: next-auth@5.0.0-beta.30

A implementação original usou `next-auth@5` por ser a biblioteca mais conhecida. Funcionou parcialmente, mas ao clicar em "Continue with Google" o erro aparecia:

```
Failed to load external module next-auth-c77c3a03231bb629:
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'/path/node_modules/next/server'
imported from /path/node_modules/next-auth/lib/env.js
Did you mean to import "next/server.js"?
```

**Causa raiz:** `next-auth@5 beta` usa imports ESM sem extensão `.js` em alguns módulos internos. O Turbopack do Next.js 16 — ativo por padrão — usa resolução ESM estrita e requer extensões explícitas. Isso é um bug do `next-auth@5` que não foi corrigido nas versões beta disponíveis.

**Soluções descartadas:**
- Adicionar ao `serverExternalPackages`: tentado, não resolveu o erro de Turbopack
- Desativar Turbopack (`--no-turbopack`): funcionaria, mas Turbopack é padrão no Next.js 16 e essa regressão seria inaceitável
- Fixar em versão beta anterior: sem garantia de estabilidade

**Solução adotada: migrar para `better-auth`**, que é compatível com Next.js 16 + Turbopack, tem API mais simples e é ativamente mantida.

### Arquitetura da autenticação com better-auth

```
Cliente React                 Servidor Next.js           SQLite
──────────────                ─────────────────          ──────
authClient.signIn.social()    
  → POST /api/auth/sign-in/social
                              better-auth handler
                                → OAuth redirect
[OAuth provider]
  → GET /api/auth/callback/google
                              better-auth cria user +
                              account na DB              INSERT INTO user ...
                              databaseHooks.user.create  INSERT INTO account ...
                                → maybeCreateDefaultTeam INSERT INTO teams ...
                              Set-Cookie: session token
  → redirect para /
authClient.useSession()
  → GET /api/auth/get-session
                              better-auth valida session  SELECT FROM session ...
                              retorna { user, session }
```

---

## Impacto para Merge com Upstream

### Arquivos novos (podem ser adicionados sem conflito)

**Migrations:**
- `server/migrations/002_auth_teams.sql` — tabelas `teams`, `team_members` (e tabelas `users`/`oauth_accounts` que foram descartadas na 003)
- `server/migrations/003_better_auth.sql` — descarta tabelas do 002 e recria com FK corretos para tabela `user` do better-auth
- `server/migrations/004_better_auth_schema.sql` — cria tabelas do better-auth: `user`, `session`, `account`, `verification`

**Auth:**
- `src/lib/auth.ts` — config completo do better-auth (Node.js)
- `src/lib/auth-client.ts` — `createAuthClient()` para componentes React
- `src/app/api/auth/[...all]/route.ts` — handler do better-auth

**Teams:**
- `src/lib/teams/team-fs.ts`
- `src/lib/teams/team-context.ts`
- `src/app/api/teams/route.ts`
- `src/app/api/teams/[slug]/route.ts`
- `src/app/api/teams/[slug]/members/route.ts`
- `src/app/api/teams/[slug]/members/[userId]/route.ts`

**KB scoped por time:**
- `src/app/api/teams/[slug]/tree/route.ts`
- `src/app/api/teams/[slug]/pages/[...path]/route.ts`
- `src/app/api/teams/[slug]/search/route.ts`
- `src/app/api/teams/[slug]/git/{log,diff,commit,pull,restore}/route.ts`

**Frontend:**
- `src/components/layout/team-switcher.tsx`
- `src/components/layout/user-menu.tsx`
- `src/components/layout/electron-detector.tsx`
- `src/app/login/login-client.tsx`
- `src/app/teams/new/page.tsx`
- `src/app/teams/[slug]/settings/page.tsx`
- `src/app/teams/[slug]/settings/settings-client.tsx`

**Agentes:**
- `src/lib/agents/user-workspace.ts`

**Docs:**
- `ai/plans/` (este arquivo)

### Arquivos removidos (deletar no upstream ao fazer merge)

- `src/lib/auth.config.ts` — era a config Edge-safe do next-auth; não necessária com better-auth
- `src/types/next-auth.d.ts` — augmentação de tipos do next-auth; better-auth tipifica corretamente sem augmentação
- `src/components/auth-provider.tsx` — era o `SessionProvider` do next-auth; better-auth não precisa de provider wrapper
- `src/app/api/auth/[...nextauth]/route.ts` — substituído por `[...all]/route.ts`

### Arquivos modificados (requer revisão de merge)

| Arquivo | O que mudou |
|---|---|
| `src/middleware.ts` | Reescrito: usa `betterFetch` para validar sessão better-auth; mantém fallback legado KB_PASSWORD |
| `src/app/login/page.tsx` | Server component que passa flags de auth para `login-client.tsx` |
| `src/app/layout.tsx` | Removido `AuthProvider`/`SessionProvider`; removida tag `<script>`; adicionado `<ElectronDetector>` |
| `src/app/teams/[slug]/settings/settings-client.tsx` | `useSession` (next-auth) → `authClient.useSession()` (better-auth) |
| `src/lib/storage/path-utils.ts` | Parâmetro `rootDir?` em 2 funções |
| `src/lib/storage/page-io.ts` | Parâmetro `dataDir?` em todas as funções |
| `src/lib/storage/tree-builder.ts` | Parâmetro `dataDir?` em `buildTree` |
| `src/lib/git/git-service.ts` | Singleton → Map por diretório; todas as funções aceitam `dataDir?` |
| `src/lib/api/client.ts` | Reescrito para suportar `teamSlug?`; adicionado `fetchUserTeams()` |
| `src/lib/agents/daemon-client.ts` | Tipos com `userId?`/`teamSlug?`; filtro por userId em `listDaemonSessions` |
| `src/lib/teams/team-context.ts` | `auth()` → `auth.api.getSession({ headers })`; importa `headers` do next/headers |
| `src/app/api/teams/route.ts` | `auth()` → `auth.api.getSession({ headers })`; importa `headers` do next/headers |
| `src/app/api/teams/[slug]/members/route.ts` | SQL: `FROM users` → `FROM user`, `FROM users WHERE email` → `FROM user WHERE email` |
| `src/stores/app-store.ts` | Adicionado `currentTeamSlug`, `teams`, ações de time |
| `src/stores/tree-store.ts` | Usa `currentTeamSlug` em todas as chamadas de API |
| `src/stores/editor-store.ts` | Usa `currentTeamSlug` em `loadPage`/`save` |
| `src/components/sidebar/sidebar.tsx` | Header com `<TeamSwitcher>`; footer com `<UserMenu>` |
| `src/components/layout/app-shell.tsx` | Carrega times no mount; recarrega tree ao trocar de time |
| `server/cabinet-daemon.ts` | `PtySession` com `userId?`/`teamSlug?`; filtro por userId em GET /sessions |
| `next.config.ts` | `next-auth` → `better-auth` em `serverExternalPackages` |
| `.env.example` | `NEXTAUTH_*` → `BETTER_AUTH_*` |

### Dependências

**Removida:**
```json
"next-auth": "^5.0.0-beta.30"
```

**Adicionada:**
```json
"better-auth": "^1.x"
```

---

## Fases de Implementação

### Fase 1 — Banco de Dados e Autenticação

#### Por que better-auth com database sessions?

better-auth gerencia suas próprias tabelas de sessão no SQLite. Diferente de JWTs puros, sessões em banco permitem revogação imediata (logout real) e inspeção de sessões ativas. O custo é uma query a mais por request autenticado — aceitável em self-hosted.

#### `server/migrations/002_auth_teams.sql` — CRIADO
Criou tabelas `users`, `oauth_accounts`, `teams`, `team_members`. As duas primeiras foram descartadas na migration 003 ao migrar para better-auth (que usa seus próprios nomes: `user`, `account`).

#### `server/migrations/003_better_auth.sql` — CRIADO
```sql
PRAGMA foreign_keys = OFF;

-- Descarta tabelas customizadas do 002 (sem dados reais ainda)
DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS users;

-- Recria teams/team_members sem FK para 'users' (que não existe mais)
-- team_members.user_id referencia better-auth's 'user.id' (sem FK declarada
-- para evitar problemas de ordem de criação entre migrations)
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
CREATE TABLE teams (...);
CREATE TABLE team_members (...);

PRAGMA foreign_keys = ON;
```

**Por que descartar e recriar `teams`/`team_members`?**  
A declaração `REFERENCES users(id)` em `team_members` referencia uma tabela que deixou de existir. SQLite não permite modificar constraints de FK com `ALTER TABLE`, então é necessário recriar. Como não havia dados reais (nenhum login havia sido completado com sucesso), a operação é segura.

#### `server/migrations/004_better_auth_schema.sql` — CRIADO
```sql
CREATE TABLE IF NOT EXISTS user (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT NOT NULL PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ...
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT NOT NULL PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  ...
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT NOT NULL PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  ...
);
```

**Nota crítica:** better-auth usaria `session` (singular) para suas sessões de auth. Já existia a tabela `sessions` (plural) para sessões PTY de agentes — sem conflito de nome.

**Por que adicionar ao sistema de migrations e não usar `auth.$migrate()`?**  
O sistema de migrations do Cabinet (`runSqlMigrations`) é síncrono e roda automaticamente na inicialização via `getDb()`. A alternativa `auth.$migrate()` é assíncrona e precisaria ser chamada explicitamente. Usar o sistema existente é mais simples e consistente.

#### `src/lib/auth.ts` — CRIADO (substituiu versão next-auth)
```typescript
import { betterAuth } from "better-auth";
import { getDb } from "@/lib/db";

export const auth = betterAuth({
  database: getDb(),       // reutiliza conexão singleton — sem second connection
  socialProviders: {
    // providers condicionais: só ativados se CLIENT_ID está configurado
    ...(process.env.GOOGLE_CLIENT_ID && { google: { ... } }),
    ...(process.env.GITHUB_CLIENT_ID && { github: { ... } }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await maybeCreateDefaultTeam(user.id);
        },
      },
    },
  },
});
```

**`databaseHooks.user.create.after`**: executado toda vez que o better-auth cria um novo usuário (primeiro login via OAuth). É o ponto ideal para criar o time "default" na primeira vez.

**`getDb()` compartilhado**: better-auth aceita uma instância `better-sqlite3` diretamente. Reusar o singleton de `getDb()` evita duas conexões abertas ao mesmo arquivo SQLite.

#### `src/lib/auth-client.ts` — CRIADO
```typescript
"use client";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
```

`createAuthClient()` sem `baseURL` autodetecta `window.location.origin`. A diretiva `"use client"` garante que não seja importado em código de servidor.

#### `src/app/api/auth/[...all]/route.ts` — CRIADO
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

Substitui `[...nextauth]/route.ts`. O handler monta automaticamente todos os endpoints do better-auth:
- `POST /api/auth/sign-in/social` — inicia fluxo OAuth
- `GET /api/auth/callback/{provider}` — recebe callback do provider
- `GET /api/auth/get-session` — retorna sessão atual (usado pelo middleware)
- `POST /api/auth/sign-out` — invalida sessão

**Nota:** os redirect URIs do Google/GitHub permanecem os mesmos (`/api/auth/callback/google`, `/api/auth/callback/github`). Nenhuma mudança necessária no console dos providers.

#### `src/middleware.ts` — REESCRITO
```typescript
import { betterFetch } from "@better-fetch/fetch";

export async function middleware(request: NextRequest) {
  // 1. Paths públicos → passa sempre
  if (isPublicPath(pathname)) return NextResponse.next();

  // 2. Legacy: KB_PASSWORD sem OAuth → verifica cookie SHA-256
  if (legacyPassword && !hasOAuth) { ... }

  // 3. Sem auth configurado → acesso livre (modo dev)
  if (!legacyPassword && !hasOAuth) return NextResponse.next();

  // 4. OAuth: valida sessão better-auth via HTTP interno
  const { data: session } = await betterFetch<{ user: { id: string } }>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

  if (!session?.user) { /* redirect /login ou 401 */ }
  return NextResponse.next();
}
```

**Por que `betterFetch` em vez de importar `auth` diretamente?**  
O middleware roda no Edge Runtime (obrigatório no Next.js — não configurável). `better-sqlite3` usa binários Node.js nativos que não funcionam em Edge. `betterFetch` faz uma chamada HTTP ao próprio servidor — o custo é mínimo para uma aplicação self-hosted e essa é a abordagem oficial recomendada pelo better-auth para Next.js middleware.

#### `src/lib/teams/team-context.ts` — ATUALIZADO
```typescript
// Antes (next-auth)
const session = await auth();

// Depois (better-auth)
const session = await auth.api.getSession({
  headers: await headers(),
});
```

`auth.api.getSession` é a forma server-side de obter a sessão no better-auth. Requer os headers da request para ler o cookie de sessão.

---

### Fase 2 — Teams CRUD

#### `src/lib/teams/team-fs.ts` — CRIADO
Duas funções:
- `getTeamDataDir(slug)`: consulta `data_dir_override` na DB; fallback para `data/teams/{slug}/`
- `initTeamDirectory(slug)`: cria o diretório e inicializa um repo git (idempotente)

**Por que `data_dir_override`?**  
Para a instalação existente, o time "default" aponta para o `DATA_DIR` raiz (ex: `./data`), que já tem um `.git/` inicializado. Sem esse override, o sistema tentaria criar `data/teams/default/` como novo repo, ignorando todo o conteúdo existente.

#### `src/lib/teams/team-context.ts` — CRIADO
- `requireTeamContext(slug)`: valida sessão better-auth + membership na tabela; lança erro com status HTTP
- `getUserTeams(userId)`: lista times de um usuário
- `teamContextErrorResponse(err)`: converte erro em `Response` JSON com status correto

Todas as rotas de API scoped chamam `requireTeamContext` como primeiro passo, garantindo que o usuário seja membro do time antes de qualquer operação.

#### Rotas de API — CRIADAS

**`/api/teams` (GET + POST)**
- GET: lista times do usuário via `getUserTeams`
- POST: cria time, slug gerado a partir do nome, adiciona criador como admin, chama `initTeamDirectory`

**`/api/teams/[slug]` (GET + PATCH + DELETE)**
- PATCH e DELETE requerem role `admin`

**`/api/teams/[slug]/members` (GET + POST)**

**SQL atualizado para tabela `user` do better-auth:**
```sql
-- Antes (tabela customizada 'users')
SELECT id FROM users WHERE email = ?
JOIN users u ON u.id = tm.user_id

-- Depois (tabela do better-auth 'user')
SELECT id FROM user WHERE email = ?
JOIN user u ON u.id = tm.user_id
```

**`/api/teams/[slug]/members/[userId]` (PATCH + DELETE)**
- PATCH muda role (admin only)
- DELETE permite auto-remoção ou remoção por admin; valida que não está removendo o último admin

---

### Fase 3 — KB Isolation (Storage + Git + Rotas)

#### `src/lib/storage/path-utils.ts` — MODIFICADO
```typescript
// Antes
export function resolveContentPath(virtualPath: string): string
export function virtualPathFromFs(fsPath: string): string

// Depois
export function resolveContentPath(virtualPath: string, rootDir?: string): string
export function virtualPathFromFs(fsPath: string, rootDir?: string): string
```
Quando `rootDir` não é fornecido, usa o `DATA_DIR` global — zero breaking change para chamadas existentes.

**Por que não mudar o `DATA_DIR` global?**  
O `DATA_DIR` é calculado uma vez no import. Mudá-lo por request não seria thread-safe e quebraria o Electron. A abordagem de parâmetro opcional é mais limpa e compatível.

#### `src/lib/storage/page-io.ts` — MODIFICADO
Todas as funções exportadas recebem `dataDir?: string`:
- `readPage(virtualPath, dataDir?)`
- `writePage(virtualPath, content, frontmatter, dataDir?)`
- `createPage(virtualPath, title, dataDir?)`
- `deletePage(virtualPath, dataDir?)`
- `movePage(fromPath, toParentPath, dataDir?)`
- `renamePage(virtualPath, newName, dataDir?)`

Todas passam `dataDir` para `resolveContentPath` e `virtualPathFromFs`.

#### `src/lib/storage/tree-builder.ts` — MODIFICADO
```typescript
// Antes
export async function buildTree(): Promise<TreeNode[]>

// Depois
export async function buildTree(dataDir?: string): Promise<TreeNode[]>
```
A função recursiva interna `buildTreeRecursive` recebe `rootDir` para calcular `virtualPathFromFs` corretamente em relação ao diretório do time.

#### `src/lib/git/git-service.ts` — MODIFICADO (refatorado)
**Antes:** singleton `let git: SimpleGit | null` e `let commitTimer`.  
**Depois:** `Map<string, SimpleGit | null>` e `Map<string, ReturnType<typeof setTimeout>>` — um por `dataDir`.

Todas as funções exportadas recebem `dataDir: string = DATA_DIR`:
- `autoCommit(pagePath, action, dataDir?)`
- `getPageHistory(virtualPath, dataDir?)`
- `getDiff(hash, dataDir?)`
- `manualCommit(message, dataDir?)`
- `restoreFileFromCommit(hash, filePath, dataDir?)`
- `gitPull(dataDir?)`
- `getStatus(dataDir?)`

**Por que Map em vez de chamar `simpleGit(dataDir)` em cada request?**  
`simpleGit` tem overhead de inicialização. Reusar instâncias por diretório é mais eficiente. O Map é limpo por processo; em caso de restart o daemon recria as instâncias.

**Por que um timer de commit por `dataDir`?**  
Se dois times salvam páginas quase ao mesmo tempo, o timer compartilhado original cancelaria o commit de um deles. Um timer por diretório garante que cada time comite independentemente.

#### Novas rotas de API scoped por time
Criadas espelhando exatamente as rotas antigas, porém com `[slug]` no path e chamando `requireTeamContext` + `getTeamDataDir`:

| Rota nova | Equivalente antigo |
|---|---|
| `/api/teams/[slug]/tree` | `/api/tree` |
| `/api/teams/[slug]/pages/[...path]` | `/api/pages/[...path]` |
| `/api/teams/[slug]/search` | `/api/search` |
| `/api/teams/[slug]/git/log/[...path]` | `/api/git/log/[...path]` |
| `/api/teams/[slug]/git/diff/[hash]` | `/api/git/diff/[hash]` |
| `/api/teams/[slug]/git/commit` | `/api/git/commit` |
| `/api/teams/[slug]/git/pull` | `/api/git/pull` |
| `/api/teams/[slug]/git/restore` | `/api/git/restore` |

**As rotas antigas foram mantidas** (não deletadas). Continuam funcionando apontando para `DATA_DIR`. Isso garante que componentes não migrados ainda funcionem.

---

### Fase 4 — Agent Isolation

#### `src/lib/agents/user-workspace.ts` — CRIADO
```typescript
getUserWorkspaceDir(teamSlug, userId): string
// → data/teams/{slug}/.agents/users/{userId}/workspace/

ensureUserWorkspace(teamSlug, userId): Promise<string>
// mkdir -p + retorna o path
```

**Por que dentro de `.agents/users/{userId}/`?**  
Mantém toda a estrutura de agentes dentro do diretório do time. O `.` previne que apareça na tree de KB. Cada usuário tem seu próprio workspace isolado para o CLI do agente.

#### `server/cabinet-daemon.ts` — MODIFICADO
Campos adicionados à interface `PtySession`:
```typescript
userId?: string;
teamSlug?: string;
```

`createDetachedSession` aceita `userId?` e `teamSlug?` e os armazena na sessão.

`POST /sessions` aceita `userId` e `teamSlug` no body.

`GET /sessions` aceita query param `?userId=` para filtrar sessões por usuário. Sessões de outros usuários não aparecem na lista.

#### `src/lib/agents/daemon-client.ts` — MODIFICADO
```typescript
// Antes
interface CreateDaemonSessionInput { id, prompt, providerId?, cwd?, timeoutSeconds? }
listDaemonSessions(): Promise<...[]>

// Depois
interface CreateDaemonSessionInput { ..., userId?, teamSlug? }
listDaemonSessions(userId?: string): Promise<...[]>
```
`listDaemonSessions` passa `?userId=` na query string quando fornecido.

---

### Fase 5 — Frontend

#### `src/stores/app-store.ts` — MODIFICADO
Adicionados ao estado:
```typescript
currentTeamSlug: string | null
teams: TeamInfo[]
setCurrentTeam(slug: string): void   // persiste em localStorage
setTeams(teams: TeamInfo[]): void    // restaura último time usado de localStorage
```

**`setTeams`** restaura o último time usado de `localStorage` para que a experiência seja consistente entre reloads.

#### `src/lib/api/client.ts` — MODIFICADO (reescrito)
Todas as funções aceitam `teamSlug?: string | null`:
```typescript
fetchTree(teamSlug?)   → /api/teams/{slug}/tree  ou  /api/tree
fetchPage(path, teamSlug?)
savePage(path, content, fm, teamSlug?)
createPageApi(parentPath, title, teamSlug?)
deletePageApi(path, teamSlug?)
movePageApi(fromPath, toParent, teamSlug?)
renamePageApi(fromPath, newName, teamSlug?)
fetchUserTeams()       → /api/teams
```

A função `teamBase(teamSlug?, resource?)` centraliza a construção da URL.

#### `src/stores/tree-store.ts` — MODIFICADO
Importa `useAppStore` e chama `useAppStore.getState().currentTeamSlug` (acesso fora de componentes React, via Zustand) antes de cada chamada de API.

#### `src/stores/editor-store.ts` — MODIFICADO
Mesmo padrão: lê `currentTeamSlug` antes de `fetchPage` e `savePage`.

#### `src/components/layout/app-shell.tsx` — MODIFICADO
```typescript
// Carrega times ao montar
useEffect(() => {
  fetchUserTeams().then(setTeams).catch(() => {});
}, [setTeams]);

// Recarrega a tree quando o time muda
useEffect(() => {
  loadTree();
}, [loadTree, currentTeamSlug]);
```

#### `src/components/layout/team-switcher.tsx` — CRIADO
Dropdown que lista times do usuário. Marca o time ativo com um checkmark. Opção "New team" navega para `/teams/new`.

**Atenção:** usa `onClick` (base-ui), não `onSelect` (Radix UI). Ver seção de correções.

#### `src/components/layout/user-menu.tsx` — CRIADO
Mostra avatar (imagem ou iniciais), nome e email do usuário. Opções:
- "Team settings" → `/teams/{currentTeamSlug}/settings` (visível apenas quando há time ativo)
- "Sign out" → `authClient.signOut()` do better-auth

**Atenção:** usa `onClick` (base-ui), não `onSelect` (Radix UI). Ver seção de correções.

#### `src/components/layout/electron-detector.tsx` — CRIADO
```typescript
"use client";
import { useEffect } from "react";

export function ElectronDetector() {
  useEffect(() => {
    if ((window as { CabinetDesktop?: boolean }).CabinetDesktop) {
      document.documentElement.classList.add("electron-desktop");
    }
  }, []);
  return null;
}
```

**Por que substituir o `<script dangerouslySetInnerHTML>`?**  
React 19 mudou o comportamento de tags `<script>` dentro de componentes React: elas são tratadas como recursos declarativos (hoisted para o `<head>`) mas não são executadas no cliente durante a hidratação. O erro de console era:

> *"Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client."*

A solução React 19-correta é `useEffect` em um client component, que executa após a hidratação — exatamente o que se deseja para detecção de ambiente.

#### `src/app/layout.tsx` — SIMPLIFICADO
```typescript
// Antes
import Script from "next/script";
import { AuthProvider } from "@/components/auth-provider";
// ...
<head>
  <Script id="electron-detect" strategy="beforeInteractive" dangerouslySetInnerHTML={...} />
</head>
<body>
  <ThemeProvider>
    <ThemeInitializer />
    <AuthProvider>{children}</AuthProvider>
  </ThemeProvider>
</body>

// Depois
import { ElectronDetector } from "@/components/layout/electron-detector";
// ...
<body>
  <ThemeProvider>
    <ThemeInitializer />
    <ElectronDetector />
    {children}
  </ThemeProvider>
</body>
```

`AuthProvider` (que era um wrapper de `SessionProvider` do next-auth) foi removido — o better-auth não precisa de provider global. O `authClient.useSession()` funciona em qualquer componente client diretamente.

#### `/teams/new/page.tsx` — CRIADO
Formulário de criação de time. POST para `/api/teams`, atualiza a lista de times no store, navega para `/` no time novo.

#### `/teams/[slug]/settings/page.tsx` + `settings-client.tsx` — CRIADOS
Página de configurações do time com três seções:
1. **General** — renomear o time (admin only)
2. **Members** — listar membros com roles, adicionar por email, trocar role, remover
3. **Danger zone** — deletar time (admin only, com confirmação)

Usa `authClient.useSession()` para mostrar/esconder ações baseadas no role do usuário atual.

---

### Fase 6 — Migração de Dados Existentes

Implementada dentro de `src/lib/auth.ts` na função `maybeCreateDefaultTeam(userId)`.

**Fluxo:**
1. Chamada automaticamente via `databaseHooks.user.create.after` (melhor-auth chama no primeiro login)
2. Verifica se a tabela `teams` está vazia (primeira execução)
3. Se `DATA_DIR` tem conteúdo não-oculto além de `teams/`: cria time "default" com `data_dir_override = DATA_DIR`
4. Se `DATA_DIR` está vazio: cria time "default" sem override (usará `data/teams/default/`)
5. O usuário que fez o primeiro login vira admin do time "default"

**Por que `data_dir_override` em vez de mover arquivos?**
- Zero risco de perda de dados
- Git history preservado (mesmo repo, mesmo `.git/`)
- Reversível: remover o override e mover os arquivos depois, se quiser
- Funciona mesmo se `data/` for um volume Docker montado

---

## Correções Pós-Implementação

### Correção 1: `onSelect` → `onClick` nos DropdownMenuItems

**Problema:** Ao clicar em "Team settings" e "New team", nada acontecia.

**Causa raiz:** O projeto usa base-ui (não Radix UI). `onSelect` é um prop exclusivo do `DropdownMenuItem` do Radix UI que fecha o menu e executa a ação atomicamente. No base-ui, `MenuPrimitive.Item` aceita apenas `onClick` padrão do React. O prop `onSelect` era passado silenciosamente como atributo DOM desconhecido, sem efeito.

**Arquivos corrigidos:**
- `src/components/layout/user-menu.tsx` — 2 ocorrências
- `src/components/layout/team-switcher.tsx` — 2 ocorrências

```typescript
// Errado (Radix UI API — ignorado no base-ui)
<DropdownMenuItem onSelect={() => router.push("/teams/new")}>

// Correto (padrão React — funciona com base-ui)
<DropdownMenuItem onClick={() => router.push("/teams/new")}>
```

**Regra geral para este projeto:** Todo `DropdownMenuItem`, `ContextMenuItem`, `AlertDialogTrigger`, `DialogTrigger` e similares do shadcn/ui **não** têm prop `asChild` e usam `onClick`, nunca `onSelect`. Ver `CLAUDE.md` — "shadcn/ui uses base-ui (NOT Radix)".

### Correção 2: Tabelas do better-auth ausentes no SQLite

**Problema:** `SqliteError: no such table: verification` ao tentar fazer login OAuth.

**Causa:** better-auth precisa criar suas tabelas (`user`, `account`, `session`, `verification`) antes do primeiro uso. Isso não acontecia automaticamente porque o sistema de migrations do Cabinet precisava ser informado sobre essas tabelas via arquivo SQL explícito.

**Solução:** Migration `004_better_auth_schema.sql` com os `CREATE TABLE IF NOT EXISTS` para todas as tabelas do better-auth, aplicada automaticamente pelo `runSqlMigrations` na próxima inicialização do servidor.

---

## Estrutura de Diretórios Resultante

```
data/
  teams/
    {team-slug}/          ← git repo próprio (.git/ independente)
      index.md
      {páginas}/
      .agents/
        users/
          {user-id}/
            workspace/    ← cwd das sessões PTY deste usuário
        {agent-slug}/
          persona.md
  .cabinet/               ← metadados internos (inalterado)
  .cabinet.db             ← SQLite: user, account, session, verification (better-auth)
                              + teams, team_members (multi-tenant)
                              + sessions (agentes PTY), activity, job_runs, etc.

# Para instalações existentes (time "default" com data_dir_override):
data/                     ← É o próprio data dir do time "default"
  index.md
  {conteúdo existente}/
  .agents/
  .cabinet.db
```

---

## Variáveis de Ambiente

```bash
# better-auth (multi-user mode)
BETTER_AUTH_SECRET=<openssl rand -base64 32>  # obrigatório em produção
BETTER_AUTH_URL=https://seu-dominio.com        # URL da aplicação

# Google OAuth
# Criar em: https://console.cloud.google.com/apis/credentials
# Authorized redirect URI: {BETTER_AUTH_URL}/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth
# Criar em: https://github.com/settings/applications/new
# Authorization callback URL: {BETTER_AUTH_URL}/api/auth/callback/github
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Legacy (apenas quando sem OAuth — backward compat)
KB_PASSWORD=
```

**Nota:** Os redirect URIs dos providers OAuth são idênticos aos que seriam usados com next-auth. Nenhuma mudança nas configurações dos providers ao fazer upgrade de next-auth para better-auth.

---

## Guia de Teste End-to-End

### 1. Verificar migrations aplicadas
```bash
node -e "
const db = require('better-sqlite3')('data/.cabinet.db');
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
const versions = db.prepare('SELECT version FROM schema_version').all();
console.log('tables:', tables.map(t => t.name));
console.log('migrations:', versions.map(v => v.version));
"
# Esperado: tables inclui user, account, session, verification, teams, team_members
# Esperado: migrations inclui [1, 2, 3, 4]
```

### 2. Auth OAuth
```bash
# Configure pelo menos um provider no .env.local
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Inicie o servidor
npm run dev:all

# Acesse http://localhost:3000
# → deve redirecionar para /login
# → clique em "Continue with Google"
# → autorize no popup do Google
# → deve voltar para / com sidebar mostrando o time "default"
```

### 3. Backward compat (senha legada)
```bash
# .env com KB_PASSWORD e sem GOOGLE/GITHUB_CLIENT_ID
KB_PASSWORD=minhasenha

# Acesse /login → formulário de senha aparece (botões OAuth não aparecem)
# → senha correta → acesso concedido
```

### 4. Sem auth configurado (modo dev)
```bash
# .env sem KB_PASSWORD e sem CLIENT_IDs
# Acesse /login → redireciona diretamente para / sem auth
```

### 5. Criação de time e migração automática
```bash
# Primeiro login com conteúdo existente em data/
# → time "default" criado automaticamente
# → SELECT * FROM teams; deve mostrar data_dir_override = '/path/to/data'
# → conteúdo aparece na sidebar normalmente
```

### 6. Isolamento de KB
```bash
# Login como usuário A → cria time "Engineering" via team switcher + New team
# → conteúdo em data/teams/engineering/
# Login como usuário B (email diferente)
# → usuário B não é membro → GET /api/teams/engineering/tree → 403
# Usuário A adiciona usuário B via /teams/engineering/settings → Members
# → usuário B consegue ver o conteúdo
```

### 7. Team settings e New team
```bash
# Team settings: clicar no avatar → Team settings → navega para /teams/{slug}/settings
# New team: clicar no nome do time (TeamSwitcher) → New team → navega para /teams/new
# (ambos usam onClick, não onSelect — ver Correção 1)
```

---

## Pontos de Atenção para Merge

1. **`src/middleware.ts`**: reescrito completamente. O merge deve garantir que qualquer customização do middleware original seja incorporada na nova lógica de auth. Verificar se o upstream adicionou paths públicos não cobertos pela lista atual.

2. **`src/app/login/page.tsx`**: convertido de client para server component. Se o upstream tiver mudanças no formulário de senha, aplicar em `login-client.tsx` (que é o client component filho).

3. **`src/lib/git/git-service.ts`**: o singleton `git` foi substituído por um `Map`. Se o upstream adicionou novas funções usando o singleton, precisam ser migradas para aceitar `dataDir`.

4. **`server/cabinet-daemon.ts`**: adições mínimas na interface `PtySession` e nos handlers HTTP. Baixo risco de conflito, mas verificar se o upstream modificou a mesma interface.

5. **`src/lib/storage/path-utils.ts`**: parâmetros opcionais adicionados. Zero breaking change — todas as chamadas existentes continuam funcionando.

6. **Migrations**: se o upstream criou migrations 002, 003 ou 004 próprias, renumerar as nossas. O sistema de migrations aplica por número de prefixo numérico (`001_`, `002_`, etc).

7. **base-ui vs Radix**: verificar todo código novo do upstream que usa `DropdownMenuItem`, `ContextMenuItem` ou qualquer outro componente shadcn/ui — substituir `onSelect` por `onClick` e remover qualquer uso de `asChild`. Este é um footgun recorrente neste projeto.

8. **better-auth vs next-auth**: o upstream usa `next-auth@4` (versão estável) ou `next-auth@5 beta`? Se usar `next-auth@4` estável, a migração para `better-auth` é a abordagem correta para Next.js 16+ independentemente.

9. **Tabelas SQL**: em toda query que referenciava `users` (tabela customizada), foi atualizado para `user` (tabela do better-auth, singular). Revisar qualquer nova query do upstream que use `users`.

---

## Arquivos Não Modificados (mas relacionados)

Os arquivos abaixo **não foram modificados** nesta feature, mas são relevantes para extensões futuras:

- `src/lib/agents/persona-manager.ts` — personas ainda são globais por `DATA_DIR`; futuro: migrar para `teamDataDir`
- `src/lib/agents/conversation-store.ts` — conversas ainda em `DATA_DIR/.agents/.conversations`; futuro: migrar para `teamDataDir`
- `src/lib/agents/conversation-runner.ts` — não passou `teamDataDir` ainda
- `src/app/api/agents/route.ts` — não extrai `userId` da sessão ainda para filtrar sessões
- As rotas antigas `/api/tree`, `/api/pages/[...path]`, `/api/search`, `/api/git/*` — mantidas como shims; podem ser removidas após migração completa do frontend
