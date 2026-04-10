# UX do Painel de IA: @ Mention com Escopo de Time e Navegação por Pastas

**Data de execução:** 2026-04-09  
**Branch:** `feat/improv`  
**Repo upstream:** `https://github.com/hilash/cabinet`  
**Status:** Implementado, TypeScript limpo, zero erros

---

## Contexto

O painel de IA (`AIPanel`) suporta menções de páginas via `@` para enviar conteúdo adicional como contexto ao agente. Três problemas de UX foram identificados:

1. **Documento atual não é pré-mencionado:** O usuário está editando um documento, abre o painel de IA e precisa encontrar manualmente esse mesmo documento para mencioná-lo com `@`. Em KBs grandes, isso é frustrante.

2. **Lista de menções não tem escopo de time:** O painel fazia `fetch("/api/tree")` sem passagem de `teamSlug`, carregando documentos de **todos os times**. Em ambientes multi-tenant, o usuário via páginas de outros times no combobox de `@`.

3. **Lista plana dificulta a navegação:** Ao digitar `@`, um dropdown com lista filtrada plana era exibido. Em KBs com muitas subpastas, encontrar um arquivo específico exigia saber parte do nome exato — não havia estrutura de pastas nem drill-down.

O painel já importava `useAppStore` (para `currentTeamSlug`) e `useEditorStore` (para `currentPath`). A `tree-store` já carregava a árvore com escopo de time. A solução foi eliminar o fetch redundante e reutilizar dados já presentes no estado da aplicação.

---

## Objetivos

1. Ao abrir o painel de IA, o documento atualmente aberto já aparece como chip de menção pré-preenchido
2. O combobox de `@` exibe apenas documentos do time atual (escopo correto)
3. Ao digitar `@` sem texto adicional, o combobox exibe a árvore de arquivos do time com navegação por pastas (browse mode)
4. Digitar texto após `@` ativa busca textual plana na lista de páginas do time (search mode)
5. Navegação por teclado funciona em ambos os modos

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Fonte de dados para menções | `useTreeStore((s) => s.nodes)` + `useMemo` | A árvore já está carregada com escopo de time; elimina fetch redundante e mantém sincronismo automático |
| Auto-menção ao abrir | `prevIsOpenRef` + `useEffect` na transição `false → true` | Dispara exatamente uma vez ao abrir; não re-adiciona se o usuário remover o chip |
| Modo browse vs search | Bifurcação em `mentionQuery.length === 0` | Sem texto = navegação estruturada; com texto = busca rápida; transição natural ao digitar/apagar |
| Itens do browse | Filtragem por `node.children?.length > 0` | Nodes com filhos = pasta (navegável); nodes folha = arquivo (selecionável) — independente do `type` |
| Navegação de pastas | Estado local `mentionBrowsePath: string | null` | Null = raiz; ao clicar em pasta, define o path; botão "Back" e Escape sobem um nível |
| Escape em subfolder | Navega para cima (não fecha) | Consistente com file managers (macOS Finder, VS Code) |
| Reset do browse path | Ao detectar novo `@` em `handleInputChange` | Cada nova menção começa da raiz — evita estado stale de navegação anterior |

---

## Arquitetura

```
Ao abrir painel:
  prevIsOpenRef: false → true
  └─► setMentionedPages([currentPath])   // auto-menção

Ao digitar "@":
  handleInputChange detecta "@" em posição válida
  └─► showMentions = true
      mentionBrowsePath = null            // reset para raiz
      mentionQuery = ""                   // browse mode

Browse mode (mentionQuery === ""):
  getBrowseItems(treeNodes, mentionBrowsePath)
  └─► node.children?.length > 0 → BrowseItem { isFolder: true }
      └─► clicar/Enter → setMentionBrowsePath(node.path)
  └─► node folha → BrowseItem { isFolder: false }
      └─► clicar/Enter → insertMention({ path, title })
  hasBackRow (mentionBrowsePath !== null):
  └─► clicar/Enter/Escape → setMentionBrowsePath(getParentPath(...))

Search mode (mentionQuery !== ""):
  filteredPages = allPages.filter(title|path inclui query)
  └─► lista plana com até 10 resultados (comportamento original)
```

### Fluxo de teclado no browse mode

```
ArrowDown / ArrowUp  → navega pelos itens (back row + BrowseItems)
Enter / Tab
  ├─ item = "back"   → getParentPath(mentionBrowsePath)
  ├─ item.isFolder   → setMentionBrowsePath(item.node.path)
  └─ item.isFile     → insertMention(...)
Escape
  ├─ mentionBrowsePath !== null → getParentPath(...)
  └─ mentionBrowsePath === null → setShowMentions(false)
```

---

## Arquivos Criados

Nenhum arquivo novo foi criado. Toda a implementação é contida em um único arquivo existente.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/ai-panel/ai-panel.tsx` | Todas as alterações descritas abaixo |

### Detalhamento das mudanças em `ai-panel.tsx`

**Imports adicionados:**
- `useMemo` (React)
- `Folder`, `ChevronLeft` (lucide-react)
- `useTreeStore` (`@/stores/tree-store`)

**Funções utilitárias adicionadas (escopo de módulo):**
- `findNodeByPath(nodes, path)` — busca recursiva de nó por path
- `getParentPath(path)` — retorna path do diretório pai ou `null` se raiz
- `interface BrowseItem { node: TreeNode; isFolder: boolean }`
- `getBrowseItems(nodes, browsePath)` — retorna filhos diretos de `browsePath` (null = raiz), excluindo nós `"website"`, mapeando para `BrowseItem`

**Estado removido:**
- `const [allPages, setAllPages] = useState<FlatPage[]>([])` — substituído por `useMemo`

**Estado adicionado:**
- `const [mentionBrowsePath, setMentionBrowsePath] = useState<string | null>(null)`
- `const prevIsOpenRef = useRef(false)` — detecta transição de abertura do painel

**Effect removido:**
- `useEffect` que fazia `fetch("/api/tree")` sem escopo de time

**Derivações adicionadas (memos):**
- `const treeNodes = useTreeStore((s) => s.nodes)` — árvore já team-scoped
- `const allPages = useMemo(() => flattenTree(treeNodes), [treeNodes])`
- `const filteredPages = useMemo(() => allPages.filter(...), [allPages, mentionQuery])`

**Effect adicionado:**
- Auto-menção ao abrir: detecta transição `isOpen: false → true` via `prevIsOpenRef`; adiciona `currentPath` a `mentionedPages` se não estiver presente

**`handleInputChange` modificado:**
- Adiciona `setMentionBrowsePath(null)` ao detectar novo `@` válido

**`handleKeyDown` reescrito:**
- Bifurca entre browse mode e search mode
- Browse mode: navega em `getBrowseItems`; Enter distingue pasta de arquivo; Escape sobe nível
- Search mode: lógica original preservada

**JSX do combobox reescrito:**
- Guard alterado de `showMentions && filteredPages.length > 0` para `showMentions`
- Browse mode: renderiza back row + lista de `BrowseItem` com ícones `Folder`/`FileText`/`ChevronRight`
- Search mode: lista plana original preservada
- Empty states: "No pages here" (browse) e "No pages found" (search)

---

## Compatibilidade com o Upstream

Este plano **não introduz APIs novas nem modifica contratos existentes**. Toda a mudança é puramente no componente de UI `AIPanel`:

- A estrutura de `TreeNode` (já existente em `@/types`) é usada sem modificação
- O `useTreeStore` já existia e já era team-scoped — apenas reutilizado aqui
- O campo `mentionedPaths` na chamada da API (`/api/agents/conversations`) permanece inalterado
- O chip de menção e o mecanismo de `insertMention` permanecem iguais

O merge com o upstream requer apenas aplicar as mudanças ao arquivo `src/components/ai-panel/ai-panel.tsx`.
