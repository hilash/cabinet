# Symlinked Repo Ciente do Time Ativo

**Data de execução:** 2026-04-09  
**Branch:** `feat/multi-tenant-auth`  
**Repo upstream:** `https://github.com/hilash/cabinet`  
**Status:** Implementado, TypeScript limpo, zero erros

---

## Contexto

Após a implementação do multi-tenant (plano `20260409010000`), todas as operações de KB — leitura/escrita de páginas, histórico git, construção de tree — passaram a ser cientes do time ativo, utilizando `getTeamDataDir(slug)` para resolver o diretório correto.

O endpoint de "Add Symlinked Repo" ficou de fora dessa migração. Ele continuava usando `resolveContentPath(folderName)` que sempre resolvia para o `DATA_DIR` global, independente do time em que o usuário estava. O resultado: ao adicionar um repo dentro do time "Atlas", o folder era criado no diretório global e aparecia somente no time padrão (que apontava para o mesmo `DATA_DIR`). O time Atlas nunca via o repo adicionado.

---

## Objetivos

1. Fazer com que o repo seja criado no diretório do time que está ativo no momento da configuração
2. O `autoCommit` também deve commitar no repositório git correto (do time, não o global)
3. Manter compatibilidade com setups single-tenant (sem times) usando `DATA_DIR` como fallback

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Como passar o time para o backend | Campo `teamSlug` no body do POST | Consistente com outros campos do mesmo endpoint; sem necessidade de nova rota |
| Fallback sem time | `DATA_DIR` global | Preserva comportamento para setups single-tenant |
| Validação de path traversal | `targetDir.startsWith(rootDir + path.sep)` | Mesma invariante de segurança que `resolveContentPath()` garantia antes |
| `autoCommit` | Passa `rootDir` como terceiro argumento | A função já aceitava `dataDir` opcional; commit vai para o git repo do time |

---

## Arquivos modificados

### `src/app/api/system/link-repo/route.ts`

**Interface extendida:**
```typescript
interface LinkRepoRequest {
  localPath?: string;
  name?: string;
  remote?: string;
  description?: string;
  teamSlug?: string;   // ← novo
}
```

**Imports alterados:**
```typescript
// Antes:
import { resolveContentPath, sanitizeFilename } from "@/lib/storage/path-utils";

// Depois:
import { DATA_DIR, sanitizeFilename } from "@/lib/storage/path-utils";
import { getTeamDataDir } from "@/lib/teams/team-fs";
```

**Resolução do `targetDir` (antes linha 119):**
```typescript
// Antes:
targetDir = resolveContentPath(folderName);

// Depois:
const rootDir = body.teamSlug ? getTeamDataDir(body.teamSlug) : DATA_DIR;
targetDir = path.join(rootDir, folderName);
if (!targetDir.startsWith(rootDir + path.sep)) {
  return NextResponse.json({ error: "Invalid folder name." }, { status: 400 });
}
```

**`autoCommit` com dataDir:**
```typescript
// Antes:
autoCommit(folderName, "Add");

// Depois:
autoCommit(folderName, "Add", rootDir);
```

---

### `src/components/sidebar/link-repo-dialog.tsx`

**Import adicionado:**
```typescript
import { useAppStore } from "@/stores/app-store";
```

**Leitura do time ativo:**
```typescript
const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);
```

**Body do POST extendido:**
```typescript
body: JSON.stringify({
  localPath: localPath.trim(),
  name: name.trim() || basenameForPath(localPath),
  remote: remote.trim() || undefined,
  description: description.trim() || undefined,
  teamSlug: currentTeamSlug ?? undefined,   // ← novo
}),
```

---

## Fluxo completo: adicionar repo no time correto

```
1. Usuário está no time "Atlas"
2. Abre o menu da sidebar → "Add Symlinked Repo"
3. Seleciona um caminho local (ex: /Users/thiago/projects/atlas-api)
4. Clica "Create"
5. Dialog envia POST /api/system/link-repo com teamSlug: "atlas"
6. Servidor: rootDir = getTeamDataDir("atlas")
           → ex: /Users/thiago/cabinet-data/teams/atlas
7. Servidor: targetDir = /Users/thiago/cabinet-data/teams/atlas/atlas-api
8. Cria index.md, .repo.yaml e symlink source → /Users/thiago/projects/atlas-api
9. autoCommit("atlas-api", "Add", rootDir) → commit no git repo do time Atlas
10. Frontend: loadTree() carrega tree do time "atlas" → repo aparece na sidebar
11. Usuário troca para time "default" → repo NÃO aparece (correto)
```

---

## Impacto para Merge com Upstream

### Arquivos modificados (requer revisão de merge)

| Arquivo | O que mudou |
|---|---|
| `src/app/api/system/link-repo/route.ts` | Importa `DATA_DIR` e `getTeamDataDir`; resolve `targetDir` com base no time; passa `rootDir` ao `autoCommit` |
| `src/components/sidebar/link-repo-dialog.tsx` | Importa `useAppStore`; lê `currentTeamSlug`; inclui `teamSlug` no body do POST |

### Sem migrations

Nenhuma alteração de schema. Usa apenas funções já existentes: `getTeamDataDir()` (team-fs.ts) e a assinatura opcional de `dataDir` em `autoCommit()` (git-service.ts).

### Backward compatibility

- Se `teamSlug` não for enviado (ex: uso direto da API), `rootDir` cai para `DATA_DIR` global
- Single-tenant sem times: `currentTeamSlug` é `null` → `teamSlug: undefined` → comportamento idêntico ao anterior

---

## Verificação

```bash
npx tsc --noEmit   # zero erros
npm run dev:all    # servidor inicia sem erros
```

Smoke test manual:
1. Criar (ou ter) dois times: "default" e "atlas"
2. Mudar para o time "atlas" na sidebar
3. Abrir "Add Symlinked Repo" → selecionar um diretório local → clicar "Create"
4. Verificar que o repo aparece na tree do time "atlas"
5. Trocar para o time "default" → repo NÃO deve aparecer
6. Verificar no filesystem: arquivo criado em `{managedDataDir}/teams/atlas/{nome}/`
