# Git Commit/Push Controlável com Identidade GitHub

**Data de execução:** 2026-04-09  
**Branch:** `feat/multi-tenant-auth`  
**Repo upstream:** `https://github.com/hilash/cabinet`  
**Status:** Implementado, TypeScript limpo, zero erros

---

## Contexto

O Cabinet faz auto-commit de cada edição de página com debounce de 5 segundos. Durante a
produção intensiva de documentos, isso resulta em centenas de micro-commits no histórico git,
tornando o `git log` praticamente inutilizável para revisão de mudanças reais.

Além disso, com a feature multi-tenant, os times têm suas próprias KBs linkadas a repositórios
que pertencem a usuários específicos do GitHub — o sistema precisava usar as **credenciais do
usuário autenticado** para commitar e fazer push, não uma identidade genérica `kb@cabinet.dev`.

---

## Objetivos

1. Tornar o auto-commit **opt-out** via variável de ambiente (`NEXT_PUBLIC_GIT_AUTO_COMMIT`)
2. Quando desativado, exibir botões **Commit** e **Push** no rodapé (`StatusBar`)
3. O modal de commit deve listar os arquivos alterados com seleção individual
4. Commits usam o **nome e e-mail do usuário logado** via GitHub SSO como autor Git
5. O push usa o **OAuth access token** do usuário logado (armazenado em `account.accessToken`)
6. Suportar remotes SSH (`git@github.com:...`) convertendo-os para HTTPS autenticado

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Prefixo da env var | `NEXT_PUBLIC_GIT_AUTO_COMMIT` | Disponível no cliente (StatusBar) e no servidor (route handlers) com o mesmo nome, sem API extra |
| Default da feature flag | `true` (qualquer valor diferente de `"false"`) | Zero impacto em instalações existentes; opt-out explícito |
| Gate do auto-commit | Early return dentro de `autoCommit()` | Não é necessário tocar nos 5 call sites; mudança isolada no git-service |
| Token de push | `account.accessToken` da tabela SQLite | Nunca exposto ao cliente; buscado server-side na rota de push |
| Identidade do commit | `authorName`/`authorEmail` enviados pelo cliente via `authClient.useSession()` | Elimina lookup extra server-side; responsabilidade do cliente fornecer os dados da sessão |
| Remotes SSH | Conversão para HTTPS autenticado na hora do push | `git@github.com:owner/repo.git` → `https://x-oauth-basic:TOKEN@github.com/owner/repo.git`; fluxo único sem dependência de chaves SSH no servidor |
| Staging seletivo | `g.add(filePaths[])` com array | simple-git aceita `string[]`; permite granularidade sem complexidade extra |
| Modal de erro do push | Dialog inline no StatusBar | Erro completo visível (tooltip não é suficiente para mensagens longas) |
| "Commit & Push" | Botão extra no CommitDialog | Fluxo mais comum em um único clique; push falha graciosamente com erro inline no modal |

---

## Scope do GitHub OAuth

O GitHub OAuth foi atualizado em `src/lib/auth.ts` para solicitar o scope `repo`, necessário para push:

```typescript
// Antes:
github: { clientId, clientSecret }

// Depois:
github: {
  clientId,
  clientSecret,
  scope: ["read:user", "user:email", "repo"],
}
```

> **Atenção para o merge:** usuários que autenticaram antes desta mudança não terão o scope
> `repo` no token armazenado. Eles precisam fazer sign out e re-autenticar uma vez.

---

## Arquivos modificados

### `.env.example` e `.env.local`

```env
# Set to 'false' to disable auto-commit and use manual Commit/Push buttons instead
NEXT_PUBLIC_GIT_AUTO_COMMIT=true
```

---

### `src/lib/git/git-service.ts`

#### Gate no `autoCommit()`

```typescript
export async function autoCommit(pagePath, action, dataDir = DATA_DIR) {
  if (process.env.NEXT_PUBLIC_GIT_AUTO_COMMIT === "false") return; // ← novo
  // ... resto inalterado
}
```

Cobre todos os call sites:
- `src/app/api/pages/[...path]/route.ts`
- `src/app/api/teams/[slug]/pages/[...path]/route.ts`
- `src/app/api/assets/[...path]/route.ts`
- `src/app/api/system/link-repo/route.ts`
- `src/lib/agents/heartbeat.ts`

#### Nova: `getChangedFiles(dataDir)`

```typescript
export interface ChangedFile {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed";
}

export async function getChangedFiles(dataDir = DATA_DIR): Promise<ChangedFile[]>
```

Chama `g.status()` e mapeia `status.files` usando os campos `index`/`working_dir`:
- `"A"` ou `"?"` → `"added"`
- `"D"` → `"deleted"`
- `"R"` → `"renamed"`
- demais → `"modified"`

Deduplicado via `Set<string>` para evitar duplicatas em arquivos com estado misto.

#### Nova: `manualCommitFiles(message, filePaths, authorName, authorEmail, dataDir)`

```typescript
export async function manualCommitFiles(
  message: string,
  filePaths: string[],
  authorName: string,
  authorEmail: string,
  dataDir = DATA_DIR
): Promise<boolean>
```

1. `await g.add(filePaths)` — staging seletivo
2. Verifica `status.staged.length`; retorna `false` se vazio
3. `await g.commit(message, undefined, { '--author': `${authorName} <${authorEmail}>` })`

#### Nova: `gitPushWithToken(token, dataDir)`

```typescript
export async function gitPushWithToken(
  token: string,
  dataDir = DATA_DIR
): Promise<{ pushed: boolean; summary: string }>
```

Algoritmo de normalização de URL do remote:

```
git@github.com:owner/repo.git
  → https://x-oauth-basic:TOKEN@github.com/owner/repo.git

ssh://git@github.com/owner/repo.git
  → https://x-oauth-basic:TOKEN@github.com/owner/repo.git

https://github.com/owner/repo.git
  → https://x-oauth-basic:TOKEN@github.com/owner/repo.git
```

Erros tratados:
- Sem remote → `"No remote configured"`
- Remote não GitHub → mensagem descritiva
- 403 / Permission denied → sugere re-autenticação com scope `repo`
- No upstream branch → orienta configuração manual via terminal

---

### `src/app/api/git/commit/route.ts`

**GET** — retorna `files` além de `uncommitted`:

```typescript
const [status, files] = await Promise.all([getStatus(), getChangedFiles()]);
return NextResponse.json({ ...status, files });
```

**POST** — aceita staging seletivo com identidade do autor:

```typescript
const { message, files, authorName, authorEmail } = body;

const committed =
  files?.length && authorName && authorEmail
    ? await manualCommitFiles(message, files, authorName, authorEmail)
    : await manualCommit(message);
```

---

### `src/app/api/teams/[slug]/git/commit/route.ts`

Mesmas alterações GET e POST, com `dataDir = getTeamDataDir(slug)` passado a cada função.

---

### `src/app/api/git/push/route.ts` *(novo)*

```typescript
// POST — busca token GitHub do usuário autenticado e faz push
const session = await auth.api.getSession({ headers: await headers() });
// SELECT accessToken FROM account WHERE userId = ? AND providerId = 'github'
// → gitPushWithToken(account.accessToken)
// → NextResponse.json({ pushed, summary })
```

Retorna HTTP 200 mesmo em caso de falha de push (a razão está em `summary`).

---

### `src/app/api/teams/[slug]/git/push/route.ts` *(novo)*

Mesma lógica, com `requireTeamContext(slug)` → `ctx.userId` para buscar o token,
e `getTeamDataDir(slug)` para o `dataDir`.

---

### `src/components/layout/commit-dialog.tsx` *(novo)*

**Props:**
```typescript
interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamSlug: string | null;
  onCommitted: () => void;  // dispara fetchGitStatus no StatusBar
}
```

**Estado:**
- `message` — texto do commit
- `files: ChangedFile[]` — carregado do GET ao abrir o modal
- `selectedPaths: Set<string>` — todos selecionados por padrão
- `action: null | "commit" | "commit-push"` — botão ativo em progresso
- `error` — exibido inline acima do footer

**Identidade do autor:** lida via `authClient.useSession()` no cliente:
```typescript
const authorName = session?.user?.name || session?.user?.email || "Cabinet User";
const authorEmail = session?.user?.email || "kb@cabinet.dev";
```

**Fluxo do botão "Commit & Push":**
1. `doCommit()` — POST no endpoint de commit com arquivos selecionados
2. Se committed: `onCommitted()` (atualiza contador no StatusBar)
3. POST no endpoint de push
4. Se push falhar: exibe erro inline no modal (não fecha)
5. Se push ok: fecha o modal

**Footer:**

| Botão | Variant | Comportamento |
|---|---|---|
| Commit & Push | `default` (primário) | Commit → Push em sequência |
| Commit | `outline` | Apenas commit |
| Close | (via `showCloseButton`) | Fecha sem ação |

---

### `src/components/layout/status-bar.tsx`

**Constante de feature flag (nível de módulo):**

```typescript
const isAutoCommitEnabled = process.env.NEXT_PUBLIC_GIT_AUTO_COMMIT !== "false";
```

**Novos estados:**
```typescript
const [commitDialogOpen, setCommitDialogOpen] = useState(false);
const [pushStatus, setPushStatus] = useState<"idle"|"pushing"|"pushed"|"error">("idle");
const [pushSummary, setPushSummary] = useState("");
const [pushErrorOpen, setPushErrorOpen] = useState(false);
```

**Botões (renderizados apenas quando `!isAutoCommitEnabled`):**
```tsx
<button onClick={() => setCommitDialogOpen(true)}>
  <GitCommitHorizontal /> Commit
</button>
<button onClick={handlePush} disabled={pushStatus === "pushing"}>
  {/* Upload / Loader2 / Check / AlertCircle conforme estado */}
  Push
</button>
```

**Modal de erro do push** — abre automaticamente quando `pushStatus` vai para `"error"`:
```tsx
<Dialog open={pushErrorOpen} onOpenChange={setPushErrorOpen}>
  <DialogContent>
    <DialogTitle className="text-destructive">
      <XCircle /> Push failed
    </DialogTitle>
    <div className="rounded-lg border border-destructive/20 bg-destructive/5">
      <p className="whitespace-pre-wrap font-mono text-xs">{pushSummary}</p>
    </div>
    <DialogFooter showCloseButton />
  </DialogContent>
</Dialog>
```

`fetchGitStatus` convertida para `useCallback` (dependência de `currentTeamSlug`) para poder ser
passada como `onCommitted` ao `CommitDialog`.

---

## Fluxo completo: commit manual com push

```
1. Usuário seta NEXT_PUBLIC_GIT_AUTO_COMMIT=false → reinicia o servidor
2. StatusBar exibe botões "Commit" e "Push" ao lado do "Sync"
3. Usuário edita documentos → sem auto-commit após 5s (gate ativo)
4. Usuário clica "Commit"
   → GET /api/teams/{slug}/git/commit retorna { uncommitted, files: [...] }
   → Modal abre com lista de arquivos modificados, todos selecionados
5. Usuário digita mensagem, desmarca arquivos indesejados
6. Clica "Commit & Push"
   → POST /api/teams/{slug}/git/commit { message, files, authorName, authorEmail }
     → g.add([arquivos selecionados])
     → g.commit(msg, { '--author': 'Nome <email>' })
   → POST /api/teams/{slug}/git/push
     → SELECT accessToken FROM account WHERE userId = ? AND providerId = 'github'
     → remote SSH convertido para https://x-oauth-basic:TOKEN@github.com/...
     → g.raw(['push', authenticatedUrl])
7. Modal fecha, StatusBar atualiza o contador de uncommitted
```

---

## Impacto para Merge com Upstream

### Arquivos novos (sem conflito esperado)

| Arquivo | Descrição |
|---|---|
| `src/app/api/git/push/route.ts` | Rota de push global |
| `src/app/api/teams/[slug]/git/push/route.ts` | Rota de push por time |
| `src/components/layout/commit-dialog.tsx` | Modal de commit com seleção de arquivos |

### Arquivos modificados (requer revisão de merge)

| Arquivo | O que mudou |
|---|---|
| `.env.example` | Nova variável `NEXT_PUBLIC_GIT_AUTO_COMMIT` |
| `src/lib/auth.ts` | Scope GitHub expandido para incluir `"repo"` |
| `src/lib/git/git-service.ts` | Gate em `autoCommit()`; 3 novas funções exportadas |
| `src/app/api/git/commit/route.ts` | GET retorna `files`; POST aceita staging seletivo e autor |
| `src/app/api/teams/[slug]/git/commit/route.ts` | Mesmas alterações com contexto de time |
| `src/components/layout/status-bar.tsx` | Feature flag; botões Commit/Push; modal de erro |

### Sem migrations

Nenhuma alteração de schema. Todas as tabelas envolvidas (`user`, `account`, `teams`,
`team_members`) já existem nas migrations `003` e `004`.

### Backward compatibility

- `NEXT_PUBLIC_GIT_AUTO_COMMIT` não definida → auto-commit continua funcionando como antes
- GET `/api/git/commit` ainda retorna `{ uncommitted }` (apenas com `files` adicionado); clientes
  que ignoram `files` continuam funcionando
- `manualCommit()` sem os novos parâmetros continua disponível e inalterado
- Times sem remote configurado: botão Push retorna mensagem descritiva, não erro HTTP

### Nota sobre tokens existentes

Usuários que autenticaram via GitHub antes da adição do scope `repo` terão token sem permissão
de push. O sistema detecta o erro 403 e exibe mensagem orientando o re-login. Nenhuma intervenção
manual no banco é necessária — o token é substituído automaticamente no próximo login.

---

## Verificação

```bash
npx tsc --noEmit   # zero erros em src/
npm run dev:all    # servidor inicia sem erros
```

Smoke test manual:

1. `NEXT_PUBLIC_GIT_AUTO_COMMIT=true` (padrão): botões Commit/Push **não** aparecem no rodapé; editar página → auto-commit após 5s no `git log`
2. `NEXT_PUBLIC_GIT_AUTO_COMMIT=false` + restart: botões **aparecem**; editar página → sem auto-commit
3. Abrir modal Commit: arquivos modificados listados com status colorido (M/A/D/R)
4. Desmarcar um arquivo → commit → `git status` confirma arquivo não staged
5. `git log --pretty="%an <%ae>"`: autor = nome e email do usuário logado
6. Botão Push (sem remote): modal de erro abre com `"No remote configured"`
7. Time com remote SSH configurado: Push converte para HTTPS com token → push bem-sucedido
8. Botão "Commit & Push": faz ambas as operações em sequência; modal fecha no sucesso
9. Push com token sem scope `repo`: modal de erro exibe mensagem com orientação de re-auth
