---

> Status note (2026-04-17): historical planning doc now. Core refactors from topics 1-8 landed. Final paths and final file sizes differ from original guess. Current notable modules: `src/lib/omni/auto-global-tokens.ts`, `src/lib/omni/compute-state.ts`, `src/store/omni-scheduler.ts`. Topic 9 still future work.

# Plano de Desenvolvimento — Redução de Débito Técnico · Unburden

## Legenda

| Campo | Valores possíveis |
|---|---|
| **Prioridade** | 🔴 P0 (crítico) · 🟠 P1 (alto) · 🟡 P2 (médio) · 🟢 P3 (baixo) |
| **Impacto no código** | 🔥 Alto · ⚡ Médio · 💧 Baixo |
| **Impacto em performance** | 🚀 Alto · ↗️ Médio · ➡️ Baixo |
| **Risco de regressão** | ☠️ Alto · ⚠️ Médio · ✅ Baixo |
| **Esforço estimado** | XS (<1h) · S (1–4h) · M (4–8h) · L (1–2 dias) · XL (3–5 dias) |

## Tópico 1 — Decomposição do `use-omni-store.ts`

**Arquivo:** `src/store/use-omni-store.ts` · **~1.040 linhas**

| Atributo | Valor |
|---|---|
| **Prioridade** | 🔴 P0 |
| **Impacto no código** | 🔥 Alto |
| **Impacto em performance** | ↗️ Médio |
| **Risco de regressão** | ⚠️ Médio |
| **Esforço estimado** | XL (3–5 dias) |

### Problema

Store misturava cinco responsabilidades:

1. scheduling engine
2. input mutation helpers
3. auto-global token logic
4. state computation
5. Zustand store público

Também tinha 4 `let` no escopo do módulo. Estado mutável global. Invisível para React/Zustand. Ruim de testar.

### Plano de Refatoração

#### Passo 1 — Extrair helpers de input (`S`)

Mover funções puras de manipulação de string para `src/lib/parser/input-mutations.ts`.

#### Passo 2 — Extrair auto-global logic (`S`)

Mover para `src/lib/parser/auto-global-tokens.ts`.

#### Passo 3 — Encapsular scheduler (`M`)

Trocar 4 `let` globais por interface clara:

```ts
export interface OmniScheduler {
  scheduleCompute(version: number, fn: () => void, debounceMs?: number): void;
  scheduleCalculation(fn: () => void): void;
  cancelAll(): void;
  readonly currentVersion: number;
  bump(): number;
}
```

Ganho:

- mata estado mutável de módulo
- scheduler vira mockável
- dependência implícita em `window` some do store principal

#### Passo 4 — Extrair `computeState` para módulo isolado (`S`)

`computeState` não depende de Zustand. Recebe parâmetros. Devolve snapshot. Cabe em módulo separado coberto por teste unitário.

#### Resultado esperado

| Antes | Depois |
|---|---|
| 1 arquivo · 1.040 linhas | 5 arquivos · ~200 linhas cada |
| 0 testes de input-mutations | ~20 testes unitários novos |
| Estado mutável global | Scheduler encapsulado e mockável |

## Tópico 2 — Decomposição do `pokemon-side-summary.tsx`

**Arquivo:** `src/components/omnibar/pokemon-side-summary.tsx` · **~1.366 linhas**

| Atributo | Valor |
|---|---|
| **Prioridade** | 🔴 P0 |
| **Impacto no código** | 🔥 Alto |
| **Impacto em performance** | 🚀 Alto |
| **Risco de regressão** | ⚠️ Médio |
| **Esforço estimado** | XL (3–5 dias) |

### Problema

`PokemonSideSummary` fazia tudo:

- resolução de espécie/set/forma
- cálculo e display de stats com stage boosts + item boosts
- editor inline de SPs
- gerenciamento de sets importados
- modal de edição completo
- switch de mega evolução
- exibição de sprite com fallback
- chips de move
- reconstrução do prompt

Bloco `summary` tinha ~240 linhas de derivação rodando no render. Lugar ruim.

### Plano de Refatoração

#### Passo 1 — Extrair derivação para hook (`M`)

Criar `usePokemonSummary(side)`. Hook devolve espécie, stats, boosts, ability, move, item, nature, spriteSources, set importado, set efetivo, flags de customização.

#### Passo 2 — Extrair componentes visuais (`M`)

Alvos:

- `PokemonStatRow.tsx`
- `PokemonSpriteCard.tsx`
- `PokemonMoveChips.tsx`
- `PokemonSetList.tsx`
- `PokemonSpEditor.tsx`

#### Passo 3 — Mover rebuild helpers para parser (`S`)

`rebuildInputWithSpecies` e `rebuildInputWithStatPoints` são funções puras. Devem morar na camada de parser.

#### Passo 4 — Enxugar componente principal (`M`)

Meta: `PokemonSideSummary` virar ~150 linhas. Só orquestração.

#### Impacto em Performance

- cursor mudando no textarea não recalcula stats
- lista de sets importados só re-renderiza quando `importedSets` muda
- animação de sprite não força recálculo de stats

## Tópico 3 — Decomposição do `inline-suggestions.ts`

**Arquivo:** `src/lib/parser/inline-suggestions.ts` · **~890 linhas**

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟠 P1 |
| **Impacto no código** | 🔥 Alto |
| **Impacto em performance** | ➡️ Baixo |
| **Risco de regressão** | ☠️ Alto |
| **Esforço estimado** | L (1–2 dias) |

### Problema

`getSlotSuggestions` tinha ~500 linhas, 15 blocos `if` / early return. Cada bloco cuidava de um tipo de sugestão. Difícil testar caminho isolado.

### Plano de Refatoração

#### Passo 1 — Definir interface de resolver (`S`)

```ts
type SlotResolver = (ctx: SuggestionContext) => AutocompleteResult | null;
```

#### Passo 2 — Extrair cada bloco para arquivo próprio (`M`)

Pipeline alvo:

- resolvers de espécie, move, ability, item e modifier
- separador
- resolvers do defensor
- resolver global

#### Passo 3 — Orquestrar com pipeline (`S`)

Resolver roda em ordem. Primeiro resultado válido vence. Benefício: teste isolado por resolver.

## Tópico 4 — Robustez da Pipeline de Dados

**Arquivos:** `scripts/generate-static-data.ts`, `scripts/generate-vgc-meta.ts`

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟠 P1 |
| **Impacto no código** | ⚡ Médio |
| **Impacto em performance** | ➡️ Baixo (build-time) |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | M (4–8h) |

### Problema

Scripts dependem de HTML de Pikalytics e Serebii. Mudança de layout podia quebrar silenciosamente e ainda gerar dado ruim.

### Plano

#### Passo 1 — Validar saída (`S`)

Verificar invariantes mínimas antes de gravar snapshots.

#### Passo 2 — Adicionar diff de integridade (`S`)

Comparar snapshot novo com antigo. Delta grande = aviso ou bloqueio.

#### Passo 3 — Separar scraping de transformação (`M`)

Estrutura alvo:

- `scripts/fetch/*` para HTTP + parse
- `scripts/transform/*` para transformação
- `generate-*` como orquestrador

#### Passo 4 — CI mensal opcional (`S`)

Rodar geração, medir diff, gritar cedo.

## Tópico 5 — Manutenção da Regulação

**Arquivo:** `src/data/regulations/regulation-m-a.json`

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟠 P1 |
| **Impacto no código** | ⚡ Médio |
| **Impacto em performance** | ➡️ Baixo |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | S (2–4h) |

### Problema

Lista da Regulation M-A era mantida manualmente. Espécie legal de baixo uso podia sumir sem ninguém notar.

### Plano

#### Passo 1 — Verificação automática no script (`S`)

Comparar roster local com roster vivo do Serebii. Avisar faltantes e extras.

#### Passo 2 — Adicionar checksum em `active.json` (`XS`)

Guardar `rosterHash` e `lastVerified`. Ganho: detectar divergência rápido.

## Tópico 6 — Resiliência dos Sprites

**Arquivo:** `src/components/omnibar/pokemon-side-summary.tsx` (`getSpriteSources`)

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟡 P2 |
| **Impacto no código** | 💧 Baixo |
| **Impacto em performance** | ➡️ Baixo |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | S (2–4h) |

### Problema

`PokemonSprite` tentava Showdown CDN e PokemonDB. Se tudo falhasse, usuário via vazio.

### Plano

#### Passo 1 — Adicionar placeholder (`S`)

Último fallback:

- iniciais do Pokémon
- cor baseada no tipo primário

#### Passo 2 — Extrair `PokemonSprite` para componente isolado (`S`)

Componente tinha estado local enterrado em arquivo gigante. Melhor extrair e testar sozinho.

## Tópico 7 — Cobertura de Testes

**Arquivos:** `src/lib/parser/`, `src/lib/calc/`, `src/store/`

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟡 P2 |
| **Impacto no código** | 🔥 Alto |
| **Impacto em performance** | ➡️ Baixo |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | L (1–2 dias) |

### Problema

Cobertura existente pegava bem caminhos principais. Lacunas críticas:

| Área | Cobertura atual | Problema |
|---|---|---|
| `input-mutations` | 0% | funções puras, trivial de testar |
| `auto-global-tokens` | ~20% por integração | faltava teste unitário |
| `stat-calc.ts` | ~30% | edge case de overflow de SPs |
| `loaders.ts` | ~40% | `resolveMegaEvolution`, sprite slugs |
| `archetypes.ts` | 0% | lógica de bulk sem teste |

### Plano

#### Passo 1 — Testar `archetypes.ts` (`S`)

Cobrir:

- retorno de 3 configs
- preferência física e especial
- override por nature custom
- forçamento por `max-def` e `max-spd`

#### Passo 2 — Testar edge cases de `stat-calc.ts` (`S`)

Cobrir clamp, arredondamento EV → SP, teto de 252 EVs, soma final de 66 SPs.

#### Passo 3 — Testar `input-mutations` após extração (`M`)

Meta: ~20 testes novos.

#### Passo 4 — Coverage threshold via Jest (`XS`)

Definir limite mínimo para `src/lib/`.

## Tópico 8 — Estado Mutável de Módulo no Store

**Arquivo:** `src/store/use-omni-store.ts`

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟠 P1 |
| **Impacto no código** | ⚡ Médio |
| **Impacto em performance** | ↗️ Médio |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | M (junto com Tópico 1 · Passo 3) |

### Problema

Quatro `let` no escopo do módulo:

- vazavam entre testes
- podiam criar race condition
- não eram resetados de forma limpa

### Solução

Encapsular no scheduler do Tópico 1. Adicionar reset do scheduler ao reset do store.

## Tópico 9 — Meta Benchmark / Team Builder (UX)

**Área:** nova funcionalidade com débito de arquitetura

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟢 P3 |
| **Impacto no código** | 🔥 Alto |
| **Impacto em performance** | ↗️ Médio |
| **Risco de regressão** | ⚠️ Médio |
| **Esforço estimado** | XL (5+ dias) |

### Problema

Direção futura mudou.

Melhor oportunidade não é um compare mode genérico.
Melhor oportunidade é:

1. `Meta Benchmark`
2. `Speed Tiers`
3. `Team Builder`

Motivo:

- projeto já tem `vgc-meta.json`
- usuário quer medir set contra o field
- store atual segue melhor como fluxo singleton para cálculo único

**Recomendação:** fazer Tópicos 1 e 2 antes. Sem isso, Tópico 9 só criaria mais débito.

Plano detalhado:

- [docs/meta-benchmark-team-builder-plan.md](C:\Users\leand\Documents\GitHub\unburden\docs\meta-benchmark-team-builder-plan.md)

## Roadmap Consolidado

```txt
SPRINT 1
  [P0] Extrair input-mutations.ts
  [P0] Extrair auto-global-tokens.ts
  [P1] Matar estado mutável com scheduler
  [P1] Validar pipeline e diff de integridade

SPRINT 2
  [P0] Extrair scheduler + computeState
  [P0] Criar usePokemonSummary
  [P0] Mover rebuild helpers para parser

SPRINT 3
  [P0] Extrair subcomponentes visuais
  [P1] Separar resolvers de sugestão
  [P2] Testar archetypes + stat-calc

SPRINT 4
  [P1] Fechar pipeline de resolvers + testes
  [P1] Verificar regulação no script + checksum
  [P2] Fallback de sprite + PokemonSprite isolado
  [P2] Testes de input-mutations + coverage threshold
  [P2] Separar fetch/transform + CI mensal

FUTURO
  [P3] Meta Benchmark / Team Builder
```

## Impacto Agregado Esperado

| Métrica | Antes | Depois (Sprints 1–4) |
|---|---|---|
| Maior arquivo | 1.366 linhas | ~200 linhas |
| Funções puras sem teste | ~30 | ~5 |
| Estado mutável de módulo | 4 variáveis globais | 0 |
| Risco de regressão na pipeline | Alto e silencioso | Médio e detectável |
| Tempo de onboarding | Alto | Médio |
| Testabilidade do scheduler | Impossível | Mockável |

Plano foi desenhado para entregar valor por sprint. Mesmo parando cedo, projeto já melhora. Extrações do Tópico 1 eram principal desbloqueador porque abriam caminho para teste unitário de código que antes só vivia em teste de integração.


