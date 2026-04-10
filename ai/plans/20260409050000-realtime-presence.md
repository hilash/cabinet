# Presença em Tempo Real (Collaborative Presence)

**Data de execução:** 2026-04-09  
**Branch:** `feat/improv`  
**Repo upstream:** `https://github.com/hilash/cabinet`  
**Status:** Implementado, TypeScript limpo, zero erros

---

## Contexto

Com o sistema multi-tenant e multi-usuário já funcional (better-auth, OAuth, isolamento por time — plano `20260409010000`), o próximo passo é tornar o Cabinet colaborativo de forma visual: usuários precisam ver quem está trabalhando simultaneamente, pular para o documento que a outra pessoa está editando e enxergar o cursor dela — inspiração no Google Docs e Figma.

A aplicação já possuía dois mecanismos de tempo real:
- **SSE** em `/api/agents/events` (padrão de polling a cada 3s)
- **WebSocket** no `terminal-server.ts` (I/O de PTY para o terminal)

Este plano reutiliza o padrão SSE já provado no codebase, mas com um **modelo de broadcast verdadeiro**: um Map de nível de módulo mantém os controllers SSE de todos os clientes conectados; qualquer HTTP POST de presença dispara um `broadcast()` imediato para todos os subscribers, sem polling.

---

## Objetivos

1. Exibir avatares de todos os usuários online no cabeçalho (estilo Google Docs), com estado offline em cinza
2. Ao clicar no avatar de um usuário online, navegar ao documento que ele está editando (estilo Figma)
3. Mostrar o cursor e a seleção do usuário remoto dentro do editor (overlay sobre o Tiptap)
4. Tudo atualizado em tempo real via SSE + HTTP POST

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Transporte | SSE + HTTP POST | Já usado e testado no codebase; funciona nativamente no Next.js App Router sem servidor extra |
| Modelo de push | Broadcast via Map de controllers | Elimina polling; cada POST dispara push instantâneo para todos os clientes SSE |
| Armazenamento de presença | In-memory singleton (módulo Node.js) | Não precisa de persistência; estados de presença são efêmeros |
| Estado do cliente | Zustand store (`presence-store.ts`) | Consistente com o padrão já adotado (app-store, editor-store, etc.) |
| Montagem do SSE | Componente `PresenceProvider` (invisível, 1× no AppShell) | Garante conexão única por cliente; evita duplicação de heartbeats |
| Cores de presença | Paleta de 8 cores vibrantes, determinística por `hash(userId)` | Estável entre reconexões; sem atribuição dinâmica que varia |
| Debounce de cursor | 300ms | Evita flood de POSTs sem prejudicar a percepção de tempo real |

---

## Arquitetura

```
Client A (editor) ──POST /api/presence──► presence-store (singleton Node.js)
                                               │
                                               └──broadcast()──► SSE stream A
                                               └──broadcast()──► SSE stream B
                                               └──broadcast()──► SSE stream C

Client B ──GET /api/presence/events──► SSE stream B ──► Zustand ──► PresenceAvatars (header)
Client C ──GET /api/presence/events──► SSE stream C ──► Zustand ──► RemoteCursors (editor)
```

### Ciclo de vida de uma sessão de presença

1. Usuário abre o app → `PresenceProvider` conecta ao SSE → recebe snapshot dos usuários ativos
2. A cada 10s → `POST /api/presence` com `currentPath` (heartbeat)
3. Ao mover cursor/selecionar texto → `POST /api/presence` com `selectionFrom/To` (debounced 300ms)
4. Ao rolar o editor → `POST /api/presence` com `scrollY` (debounced 300ms)
5. Ao fechar a aba → SSE `abort` signal → `removePresence()` → evento `leave` para todos
6. Após 30s sem heartbeat → avatar fica cinza (offline visual)
7. Após 5min sem heartbeat → removido completamente da lista

---

## Arquivos Criados

### Backend

| Arquivo | Propósito |
|---|---|
| `src/lib/presence/presence-store.ts` | Singleton com `presenceMap`, `sseClients`, `updatePresence()`, `broadcast()`, cleanup automático |
| `src/app/api/presence/route.ts` | `POST /api/presence` — atualiza presença do usuário autenticado |
| `src/app/api/presence/events/route.ts` | `GET /api/presence/events?team={slug}` — stream SSE, snapshot inicial + push incremental |

### Frontend

| Arquivo | Propósito |
|---|---|
| `src/stores/presence-store.ts` | Zustand store com `remoteUsers[]` e `applyEvent()` para snapshot/update/leave |
| `src/components/presence/presence-provider.tsx` | Componente invisível: gerencia SSE + heartbeat; exporta `sendPresenceUpdate()` |
| `src/components/presence/presence-avatars.tsx` | Stack de avatares no header (online=cor, offline=cinza, click=follow) |
| `src/components/presence/remote-cursors.tsx` | Overlay absoluto no editor: cursor, nome, highlight de seleção |

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/layout/app-shell.tsx` | Monta `<PresenceProvider />` uma vez na raiz do app |
| `src/components/layout/header.tsx` | Adiciona `<PresenceAvatars />` antes dos `<HeaderActions />` |
| `src/components/editor/editor.tsx` | `onSelectionUpdate` + `onScroll` → `debouncedSendPresence()`; `<RemoteCursors />` no container do editor |

---

## Estados Visuais dos Avatares

| Estado | `lastSeen` | Aparência |
|---|---|---|
| Online | < 30s | Cor completa + ponto verde de status |
| Offline recente | 30s – 5min | Grayscale + opacidade 0.55, sem ponto verde |
| Removido | > 5min | Não aparece na lista |

---

## Fluxo "Follow User" (clicar no avatar)

1. `followUser(user)` em `presence-avatars.tsx`
2. Expande o path da árvore com `expandPath()` + seleciona com `selectPage()`
3. Carrega a página com `useEditorStore.getState().loadPage(user.currentPath)`
4. Após 300ms (tempo de carregamento), faz scroll para `user.scrollY`
5. `RemoteCursors` exibe automaticamente o cursor do usuário naquela página

---

## Notas de Compatibilidade

- Funciona em modo single-tenant (sem times configurados): `teamSlug` faz fallback para `"default"`
- Compatível com React 19 + Next.js 16 App Router (ReadableStream nativo, sem bibliotecas extras)
- Não requer novo servidor ou processo: roda inteiramente dentro do processo Next.js existente
- SSE se reconecta automaticamente via `EventSource` nativo do browser após os 10min de auto-close
