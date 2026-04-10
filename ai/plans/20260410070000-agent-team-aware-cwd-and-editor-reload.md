# Agent Team-Aware CWD, Editor Auto-Reload e Fix do Daemon

**Data de execução:** 2026-04-10  
**Branch:** `feat/improv`  
**Repo upstream:** `https://github.com/hilash/cabinet`  
**Status:** Implementado, TypeScript limpo, zero erros

---

## Contexto

Com o modelo multi-tenant consolidado (times com `data_dir_override` customizável), três problemas foram identificados:

### Problema 1 — Agente ignorava o diretório do time

Quando o usuário abria o AI Panel para editar um documento, o `conversation-runner.ts` construía o prompt e o `cwd` da sessão sempre apontando para o `DATA_DIR` global — independente do time ativo. As linhas críticas:

```typescript
// ANTES (conversation-runner.ts)
const cwd = persona?.workdir && persona.workdir !== "/data"
  ? `${DATA_DIR}/${persona.workdir.replace(/^\/+/, "")}`
  : DATA_DIR;

const prompt = [
  `Work in the Cabinet knowledge base at ${DATA_DIR}.`,
  `You are editing the page at ${DATA_DIR}/${input.pagePath}.`,
  ...
].join("\n");
```

O `teamSlug` não era propagado da UI até o runner, então o agente editava arquivos em `data/` mesmo que o time tivesse um `data_dir_override` diferente.

### Problema 2 — Editor não atualizava após edição pelo agente

Após o agente terminar a sessão, o documento no editor permanecia desatualizado. O usuário precisava navegar para outra página e voltar para ver o conteúdo novo.

O código já tentava resolver isso via `loadPage` dentro de `handleSessionEnd`, mas a cadeia `loadPage → store.content → useEffect` era bloqueada pela guarda:

```typescript
// Em editor.tsx
if (useEditorStore.getState().isDirty && currentPath === prevPathRef.current) return;
```

Quando o `content` mudava na mesma página (sem troca de `currentPath`), o `prevPathRef.current` já estava configurado para aquele path, tornando o comportamento frágil e dependente do estado de `isDirty`.

### Problema 3 — Daemon rejeitava o cwd dos times externos

Mesmo após o `conversation-runner.ts` computar o `cwd` correto via `getTeamDataDir(teamSlug)`, o daemon descartava esse valor:

```typescript
// ANTES (cabinet-daemon.ts)
function resolveSessionCwd(input?: string): string {
  if (!input) return DATA_DIR;
  const resolved = path.resolve(input);
  if (resolved.startsWith(DATA_DIR)) return resolved;
  return DATA_DIR; // ← todo path fora de DATA_DIR era descartado aqui
}
```

Times com `data_dir_override` apontando para qualquer path fora de `{project}/data` (o caso normal em produção) sempre executavam suas sessões com `cwd = DATA_DIR`.

Isso explicava por que o **Claude funcionava** (usa caminhos absolutos explícitos no prompt e ferramentas de arquivo próprias) mas o **Codex falhava** (usa o `cwd` como âncora do projeto para resolver paths relativos e inferir contexto).

---

## Objetivos

1. O agente (Claude ou Codex) deve sempre trabalhar no diretório configurado do time ativo
2. Ao concluir a sessão, o editor deve atualizar o documento automaticamente sem interação do usuário
3. O daemon deve aceitar qualquer `cwd` absoluto passado via API autenticada

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Propagação do `teamSlug` | Frontend → API → runner (via body JSON) | Caminho mais direto; evita inferência no servidor que precisaria de contexto de auth |
| Helper de resolução de dataDir | `resolveDataDir(teamSlug?)` dentro do runner | Centraliza a lógica de fallback; todas as funções do runner usam o mesmo helper |
| Passagem de `dataDir` para `buildMentionContext` | Parâmetro opcional | `readPage` já aceita `dataDir` opcional; threading natural sem quebrar callers existentes |
| Mecanismo de reload do editor | Evento DOM customizado `ai:page_updated` | Mesmo padrão já usado pelo sistema de presença (`presence:content_update`); bypassa a cadeia store→useEffect; funciona independentemente do estado de `isDirty` |
| `remoteUpdateRef` no handler do evento | Reutilizado do sistema de presença | Previne double-update: bloqueia o `useEffect` de conteúdo enquanto o handler está atualizando o editor diretamente |
| Relaxamento de `resolveSessionCwd` | Aceitar qualquer path absoluto | O endpoint `POST /sessions` requer daemon token (autenticado); WebSocket sessions nunca passam `cwd`; a restrição original era desnecessária para chamadas autenticadas |

---

## Arquivos Modificados

### `src/lib/agents/conversation-runner.ts`

**Imports adicionados:**
```typescript
import { getTeamDataDir } from "../teams/team-fs";
```

**Helper adicionado:**
```typescript
function resolveDataDir(teamSlug?: string): string {
  if (teamSlug) return getTeamDataDir(teamSlug);
  return DATA_DIR;
}
```

**`buildMentionContext` — assinatura atualizada:**
```typescript
// ANTES
async function buildMentionContext(mentionedPaths: string[]): Promise<string>
// DEPOIS
async function buildMentionContext(mentionedPaths: string[], dataDir?: string): Promise<string>
// readPage(pagePath) → readPage(pagePath, dataDir)
```

**`buildManualConversationPrompt` — campo `teamSlug?` adicionado:**
```typescript
// Interface de entrada
export async function buildManualConversationPrompt(input: {
  agentSlug: string;
  userMessage: string;
  mentionedPaths?: string[];
  teamSlug?: string;           // ← novo
})
// Lógica interna
const dataDir = resolveDataDir(input.teamSlug);
const mentionContext = await buildMentionContext(input.mentionedPaths || [], dataDir);
const cwd = persona?.workdir && persona.workdir !== "/data"
  ? `${dataDir}/${persona.workdir.replace(/^\/+/, "")}`
  : dataDir;
// prompt referencia dataDir em vez de DATA_DIR
```

**`buildEditorConversationPrompt` — campo `teamSlug?` adicionado:**
```typescript
export async function buildEditorConversationPrompt(input: {
  pagePath: string;
  userMessage: string;
  mentionedPaths?: string[];
  teamSlug?: string;           // ← novo
})
// Mesmo padrão: dataDir = resolveDataDir(input.teamSlug)
// Todas as referências a DATA_DIR substituídas por dataDir
```

**`processPostActions` — parâmetro `dataDir` adicionado:**
```typescript
// ANTES
async function processPostActions(actions, job): Promise<void>
// DEPOIS
async function processPostActions(actions, job, dataDir: string = DATA_DIR): Promise<void>
// simpleGit(DATA_DIR) → simpleGit(dataDir)
```

**`startJobConversation` — parâmetro `teamSlug?` adicionado:**
```typescript
// ANTES
export async function startJobConversation(job: JobConfig): Promise<JobRun>
// DEPOIS
export async function startJobConversation(job: JobConfig, teamSlug?: string): Promise<JobRun>
// const dataDir = resolveDataDir(teamSlug)
// cwd e post-actions usam dataDir
```

---

### `src/app/api/agents/conversations/route.ts`

**Extração de `teamSlug` do body:**
```typescript
const teamSlug = typeof body.teamSlug === "string" && body.teamSlug.trim()
  ? body.teamSlug.trim()
  : undefined;
```

**Propagação para os builders:**
```typescript
const conversationInput = source === "editor" && pagePath
  ? await buildEditorConversationPrompt({ pagePath, userMessage, mentionedPaths, teamSlug })
  : await buildManualConversationPrompt({ agentSlug, userMessage, mentionedPaths, teamSlug });
```

---

### `src/components/ai-panel/ai-panel.tsx`

**Leitura do `currentTeamSlug`:**
```typescript
const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);
```

**Inclusão no POST body de `handleSubmit`:**
```typescript
body: JSON.stringify({
  source: "editor",
  pagePath: currentPath,
  userMessage: instruction,
  mentionedPaths: selectedMentionedPages,
  teamSlug: currentTeamSlug,   // ← novo
}),
```

**`handleSessionEnd` reescrito — usa evento DOM em vez de `loadPage`:**
```typescript
// ANTES
const handleSessionEnd = useCallback(async (sessionId) => {
  // ...
  if (session && currentPagePath === session.pagePath) {
    setTimeout(() => loadPage(session.pagePath), 500);
  }
}, [loadPage, loadPastSessions, markSessionCompleted]);

// DEPOIS
const handleSessionEnd = useCallback(async (sessionId) => {
  // ...
  if (session && currentPagePath === session.pagePath) {
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("ai:page_updated", { detail: { path: session.pagePath } })
      );
    }, 500);
  }
}, [loadPastSessions, markSessionCompleted]);  // loadPage removido das deps
```

O botão de navegação para outras páginas em execução foi atualizado para usar `useEditorStore.getState().loadPage(...)` (chamada direta ao store) já que `loadPage` foi removido do escopo destrutivo do componente.

---

### `src/components/editor/editor.tsx`

**Novo `useEffect` — listener para `ai:page_updated`:**

```typescript
useEffect(() => {
  const handler = async (e: Event) => {
    const { path } = (e as CustomEvent<{ path: string }>).detail;
    if (!editor) return;

    const state = useEditorStore.getState();
    if (path !== state.currentPath) return;

    // Bloqueia o useEffect de conteúdo de rodar em duplicata (mesmo padrão do sistema de presença)
    remoteUpdateRef.current = true;
    isLoadingRef.current = true;

    try {
      // loadPage atualiza content, frontmatter, saveStatus no store
      await state.loadPage(path);
      const freshContent = useEditorStore.getState().content;
      const html = await markdownToHtml(freshContent, path);
      editor.commands.setContent(html);
    } finally {
      setTimeout(() => {
        isLoadingRef.current = false;
        remoteUpdateRef.current = false;
      }, 100);
    }
  };

  window.addEventListener("ai:page_updated", handler);
  return () => window.removeEventListener("ai:page_updated", handler);
}, [editor]);
```

**Por que esse padrão?**

O `useEffect` existente que observa `[editor, content, currentPath]` tem a guarda:
```typescript
if (useEditorStore.getState().isDirty && currentPath === prevPathRef.current) return;
```

Quando `loadPage` é chamado na mesma página (sem troca de `currentPath`), `prevPathRef.current` já aponta para esse mesmo path. O comportamento da guarda varia com o estado de `isDirty` no momento exato do re-render, tornando o reload via store→useEffect não-determinístico.

O evento DOM `ai:page_updated` resolve isso:
1. Chama `loadPage` diretamente pelo state reference (não via hook)
2. Usa `remoteUpdateRef.current = true` para bloquear o `useEffect` de conteúdo de re-executar enquanto o handler está ativo
3. Atualiza o editor via `editor.commands.setContent(html)` diretamente — garantido

---

### `server/cabinet-daemon.ts`

**`resolveSessionCwd` simplificada:**

```typescript
// ANTES — path fora de DATA_DIR era silenciosamente descartado
function resolveSessionCwd(input?: string): string {
  if (!input) return DATA_DIR;
  const resolved = path.resolve(input);
  if (resolved.startsWith(DATA_DIR)) return resolved;
  return DATA_DIR;
}

// DEPOIS — aceita qualquer path absoluto
function resolveSessionCwd(input?: string): string {
  if (!input) return DATA_DIR;
  // Sessões via POST /sessions são autenticadas (daemon token).
  // Sessões via WebSocket nunca passam cwd → sempre caem no branch !input.
  return path.resolve(input);
}
```

**Análise de segurança:**

| Origem do cwd | Autenticação | Comportamento |
|---|---|---|
| WebSocket (`/api/daemon/pty`) | Token via query param | `cwd` nunca passado → branch `!input` → `DATA_DIR` |
| API REST (`POST /sessions`) | Bearer token (daemon token) | Path autenticado → aceito diretamente |
| `/trigger` endpoint | Bearer token | Não passa `cwd` → `DATA_DIR` |

A restrição `startsWith(DATA_DIR)` fazia sentido em ambiente single-tenant onde `DATA_DIR` era sempre o único diretório válido. Em multi-tenant com `data_dir_override`, times podem ter KBs em qualquer path absoluto do sistema — a validação correta é a autenticação do daemon token, não a checagem do prefixo.

---

## Arquivos Criados

Nenhum arquivo novo foi criado.

---

## Fluxo completo após as alterações

```
1. Usuário abre AI Panel enquanto edita "folder/my-doc" no time "atlas"
   └─ team "atlas" tem data_dir_override = "/Users/dev/projects/atlas/docs"

2. Usuário digita mensagem e envia
   └─ ai-panel.tsx POST /api/agents/conversations
      body: { source: "editor", pagePath: "folder/my-doc",
              teamSlug: "atlas", mentionedPaths: [...] }

3. API extrai teamSlug, chama buildEditorConversationPrompt
   └─ dataDir = getTeamDataDir("atlas") = "/Users/dev/projects/atlas/docs"
   └─ cwd = "/Users/dev/projects/atlas/docs"
   └─ prompt: "You are editing the page at /Users/dev/projects/atlas/docs/folder/my-doc."

4. createDaemonSession({ cwd: "/Users/dev/projects/atlas/docs", ... })
   └─ POST daemon/sessions com cwd no body

5. Daemon recebe POST (autenticado), resolveSessionCwd retorna o path real
   └─ pty.spawn(command, args, { cwd: "/Users/dev/projects/atlas/docs" })

6. Claude/Codex roda no diretório correto, edita o arquivo correto

7. Processo termina → ws.onclose → handleSessionEnd
   └─ markSessionCompleted → loadPastSessions
   └─ setTimeout 500ms → dispatchEvent("ai:page_updated", { path: "folder/my-doc" })

8. KBEditor recebe o evento
   └─ loadPage("folder/my-doc") → fetch /api/teams/atlas/pages/folder/my-doc
   └─ store atualizado (content, frontmatter)
   └─ markdownToHtml(freshContent) → editor.commands.setContent(html)
   └─ Editor atualiza na tela sem interação do usuário ✓
```

---

## Impacto para Merge com Upstream

O upstream (`https://github.com/hilash/cabinet`) não possui a feature multi-tenant. Para aplicar este plano no upstream, os pré-requisitos são:

- **Plano 01:** Multi-Team Multi-User (tabela `teams`, `getTeamDataDir`)
- **Plano 02:** Per-Team KB Path (`setTeamKbPath`, `data_dir_override`)

Com os pré-requisitos, o merge é straightforward:

### Arquivos que requerem merge manual

| Arquivo | O que mudou |
|---|---|
| `src/lib/agents/conversation-runner.ts` | Import de `getTeamDataDir`; helper `resolveDataDir`; parâmetro `teamSlug?` em 3 funções exportadas; parâmetro `dataDir` em `processPostActions` |
| `src/app/api/agents/conversations/route.ts` | Extração e propagação de `teamSlug` do body |
| `src/components/ai-panel/ai-panel.tsx` | Leitura de `currentTeamSlug`; inclusão no POST body; reescrita de `handleSessionEnd` para usar evento DOM |
| `src/components/editor/editor.tsx` | Novo `useEffect` para `ai:page_updated` |
| `server/cabinet-daemon.ts` | Simplificação de `resolveSessionCwd` |

### Sem migrations

Nenhuma alteração de schema de banco de dados.

### Backward compatibility

- Times sem `data_dir_override` continuam usando `DATA_DIR/teams/{slug}`
- `buildManualConversationPrompt` e `buildEditorConversationPrompt` sem `teamSlug` usam `DATA_DIR` (fallback via `resolveDataDir`)
- Jobs sem `teamSlug` continuam usando `DATA_DIR`
- WebSocket sessions do terminal interativo: `cwd = DATA_DIR` (não passam `cwd` → branch `!input` em `resolveSessionCwd`)

---

## Verificação

```bash
npx tsc --noEmit   # zero erros
npm run dev:all    # servidor + daemon iniciam sem erros
```

Smoke test manual:

1. Configurar um time com `data_dir_override` em Team Settings (ex: `/tmp/test-team`)
2. Navegar para um documento desse time
3. Abrir o AI Panel, solicitar uma edição simples ("adicione uma linha no final")
4. Verificar no terminal do daemon que o processo rodou com `cwd = /tmp/test-team`
5. Verificar que o arquivo editado está em `/tmp/test-team/`, não em `data/`
6. Verificar que o editor atualiza automaticamente ao terminar a sessão (sem navegar para outra página)
7. Repetir com provedor **Codex** (selecionar em Settings → Agents) e confirmar mesmo comportamento
