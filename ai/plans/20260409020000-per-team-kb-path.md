# Per-Team KB Path & Team-Aware StatusBar

**Data de execução:** 2026-04-09  
**Branch:** `feat/multi-tenant-auth`  
**Repo upstream:** `https://github.com/hilash/cabinet`  
**Status:** Implementado, TypeScript limpo, zero erros

---

## Contexto

Com a feature de multi-tenant implementada, cada time tinha sua KB armazenada em
`{CABINET_DATA_DIR}/teams/{slug}` — um caminho gerenciado internamente pelo Cabinet.

O problema: times de engenharia querem usar o Cabinet para trabalhar na documentação de
seus projetos e depois commitar essa documentação **dentro do próprio repositório do projeto**
(ex: `meu-projeto/context/`). Isso não era possível sem alterar variáveis de ambiente globais
que afetariam todos os times.

Além disso, o rodapé (`StatusBar`) exibia o status git da KB padrão global (`/api/git/commit`),
ignorando qual time estava ativo — tornando o contador de "uncommitted" e o botão "Sync"
inúteis no contexto multi-tenant.

---

## Objetivos

1. Permitir que cada time configure um **caminho absoluto** para sua KB diretamente na tela de configurações do time
2. Fallback inteligente: se nenhum caminho for definido, usar `CABINET_DATA_DIR/teams/{slug}`
3. Tornar o rodapé **consciente do time ativo**: git status e Sync devem refletir o repositório do time atual

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Coluna de armazenamento | Reutilizar `data_dir_override` | Já existia na tabela `teams`; já era lido por `getTeamDataDir()`; zero migration |
| Exposição na API | `kbPath` (alias de `data_dir_override`) + `effectivePath` | Separa o valor configurado do valor resolvido; frontend nunca precisa calcular o fallback |
| Validação do path | `path.isAbsolute()` no servidor | Rejeita caminhos relativos e traversal antes de tocar o disco |
| Inicialização do diretório | `setTeamKbPath()` cria pasta + `git init` se necessário | Mesmo comportamento de `initTeamDirectory()`; idempotente |
| Endpoint no StatusBar | `/api/teams/{slug}/git/commit` e `.../git/pull` | Rotas já existiam e já usavam `getTeamDataDir(slug)`; mudança mínima no cliente |
| Re-fetch ao trocar de time | `useEffect([currentTeamSlug])` | Garante que o contador de uncommitted atualiza imediatamente ao trocar de time |

---

## Arquivos modificados

### `src/lib/teams/team-fs.ts`

**Adição:** função `setTeamKbPath(teamSlug, absolutePath | null)`

```typescript
export async function setTeamKbPath(
  teamSlug: string,
  absolutePath: string | null
): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE teams SET data_dir_override = ? WHERE slug = ?")
    .run(absolutePath, teamSlug);

  if (absolutePath) {
    await fs.mkdir(absolutePath, { recursive: true });
    const gitDir = path.join(absolutePath, ".git");
    if (!existsSync(gitDir)) {
      const git = simpleGit(absolutePath);
      await git.init();
      await git.addConfig("user.email", "kb@cabinet.dev");
      await git.addConfig("user.name", "Cabinet");
    }
  }
}
```

Responsabilidades:
- Atualiza `data_dir_override` no SQLite
- Se `absolutePath` for fornecido: cria o diretório (idempotente) e inicializa git repo se ausente
- Se `absolutePath` for `null`: limpa o override, time volta ao caminho padrão

---

### `src/app/api/teams/[slug]/route.ts`

**GET** — agora retorna `kbPath` e `effectivePath`:

```typescript
// Antes:
"SELECT id, name, slug, created_at FROM teams WHERE id = ?"
// retornava apenas { id, name, slug, created_at }

// Depois:
"SELECT id, name, slug, created_at, data_dir_override FROM teams WHERE id = ?"
// retorna { ...row, kbPath: row.data_dir_override ?? null, effectivePath: getTeamDataDir(slug) }
```

**PATCH** — aceita `kbPath` além de `name` (ambos opcionais e independentes):

```typescript
const { name, kbPath } = await req.json();

// kbPath: string → valida isAbsolute → chama setTeamKbPath(slug, kbPath)
// kbPath: null   → chama setTeamKbPath(slug, null)  → reset para padrão
// name: string   → UPDATE teams SET name = ? (comportamento anterior preservado)
```

Validação: retorna HTTP 400 se `kbPath` for fornecido mas não for um caminho absoluto.

---

### `src/app/teams/[slug]/settings/settings-client.tsx`

**Interface `Team` extendida:**
```typescript
interface Team {
  id: string;
  name: string;
  slug: string;
  kbPath: string | null;      // ← novo
  effectivePath: string;       // ← novo
}
```

**Estado adicionado:**
```typescript
const [kbPath, setKbPath] = useState("");
const [effectivePath, setEffectivePath] = useState("");
const [savingPath, setSavingPath] = useState(false);
```

**Novos handlers:**
- `handleSavePath(e)` — PATCH com `{ kbPath: value | null }`
- `handleResetPath()` — PATCH com `{ kbPath: null }`, limpa o input

**Nova seção "Knowledge Base"** (entre General e Members):
- Input monospace com o caminho absoluto configurado
- Placeholder mostra o `effectivePath` (caminho padrão) como dica visual
- Botão **Save** — desabilitado se o valor não mudou ou enquanto salva
- Botão **Reset** — visível apenas quando há um caminho customizado; remove o override
- Todo o bloco é `disabled` para não-admins

---

### `src/components/layout/status-bar.tsx`

**Antes:** sempre chamava `/api/git/commit` e `/api/git/pull` (DATA_DIR global)

**Depois:** roteia via time ativo

```typescript
const currentTeamSlug = useAppStore((s) => s.currentTeamSlug);

// fetchGitStatus:
const endpoint = currentTeamSlug
  ? `/api/teams/${currentTeamSlug}/git/commit`
  : `/api/git/commit`;

// pullAndRefresh:
const endpoint = currentTeamSlug
  ? `/api/teams/${currentTeamSlug}/git/pull`
  : `/api/git/pull`;
```

**Effect de polling atualizado:**
```typescript
useEffect(() => {
  // re-busca imediatamente ao trocar de time
}, [currentTeamSlug]);
```

`pullAndRefresh` adicionou `currentTeamSlug` ao array de dependências do `useCallback`.

---

## Fluxo completo: configurar KB de um projeto

```
1. Usuário abre Team Settings do time "Atlas"
2. Seção "Knowledge Base" aparece com placeholder mostrando o caminho padrão
   ex: /Users/thiago/cabinet-data/teams/atlas
3. Usuário digita o caminho do projeto: /Users/thiago/projects/atlas-api/context
4. Clica "Save"
5. Servidor: valida isAbsolute → cria diretório → git init (se não existir) → persiste no DB
6. Frontend: exibe effectivePath = /Users/thiago/projects/atlas-api/context
7. StatusBar começa a mostrar uncommitted count de /projects/atlas-api/context
8. Botão "Sync" faz pull nesse repositório
9. Toda edição de KB é salva em /projects/atlas-api/context/*.md
10. Usuário pode `git add context/ && git commit` no repositório do projeto
```

---

## Impacto para Merge com Upstream

### Arquivos modificados (requer revisão de merge)

| Arquivo | O que mudou |
|---|---|
| `src/lib/teams/team-fs.ts` | Nova função `setTeamKbPath()` exportada |
| `src/app/api/teams/[slug]/route.ts` | GET retorna `kbPath`/`effectivePath`; PATCH aceita `kbPath`; importa `path`, `setTeamKbPath`, `getTeamDataDir` |
| `src/app/teams/[slug]/settings/settings-client.tsx` | Interface `Team` extendida; novos estados e handlers; nova seção "Knowledge Base" no JSX |
| `src/components/layout/status-bar.tsx` | Lê `currentTeamSlug` do app-store; roteia git fetches pelo time ativo; effect de polling re-executa ao trocar de time |

### Sem migrations

A coluna `data_dir_override` já existe na tabela `teams` desde a migration `003_better_auth.sql`.
Nenhuma alteração de schema é necessária.

### Backward compatibility

- Times sem `kbPath` configurado continuam usando `getManagedDataDir()/teams/{slug}`
- `CABINET_DATA_DIR` continua sendo respeitado como base do caminho padrão
- Single-tenant (sem times): StatusBar usa `/api/git/commit` (fallback quando `currentTeamSlug` é null)

---

## Verificação

```bash
npx tsc --noEmit   # zero erros
npm run dev:all    # servidor inicia sem erros
```

Smoke test manual:
1. `Team Settings` → seção "Knowledge Base" visível
2. Definir path absoluto → Save → effective path atualiza
3. Network tab: StatusBar chama `/api/teams/{slug}/git/commit`
4. Sync: chama `/api/teams/{slug}/git/pull`
5. Reset → campo limpa, volta ao caminho padrão
6. Não-admin: campo desabilitado, sem botão Save
