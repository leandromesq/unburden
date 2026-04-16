---

# 🗺️ Plano de Desenvolvimento — Redução de Débito Técnico · Omniboost

---

## Legenda

| Campo | Valores possíveis |
|---|---|
| **Prioridade** | 🔴 P0 (crítico) · 🟠 P1 (alto) · 🟡 P2 (médio) · 🟢 P3 (baixo) |
| **Impacto no código** | 🔥 Alto · ⚡ Médio · 💧 Baixo |
| **Impacto em performance** | 🚀 Alto · ↗️ Médio · ➡️ Baixo |
| **Risco de regressão** | ☠️ Alto · ⚠️ Médio · ✅ Baixo |
| **Esforço estimado** | XS (<1h) · S (1–4h) · M (4–8h) · L (1–2 dias) · XL (3–5 dias) |

---

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

O store mistura **cinco responsabilidades completamente distintas** num único arquivo:

1. **Scheduling engine** — `scheduledComputeFrame`, `scheduledCalculationHandle`, `cancelScheduledWork`, `requestAnimationFrame` + `requestIdleCallback`.
2. **Input mutation helpers** — `insertChipToken`, `removeChipToken`, `setScopedStageToken`, `setHpPercentageToken`, `stripGlobalSectionTokens`, etc. (30+ funções puras de manipulação de string).
3. **Auto-global token logic** — `deriveAutoGlobalState`, `applyAutoGlobalTokens`, `buildRecommendedGlobalOptions`, `prioritizeRecommendedGlobals` (~120 linhas de lógica de negócio isolável).
4. **State computation** — `computeState` (função central que orquestra parse + cálculo).
5. **Zustand store** — O `create()` propriamente dito com as actions públicas.

Além disso, os 4 `let` no escopo do módulo (`scheduledComputeFrame`, `scheduledComputeVersion`, etc.) são **estado mutável global** — completamente invisível ao sistema de reatividade do React/Zustand e impossible de testar isoladamente.

### Plano de Refatoração

#### Passo 1 — Extrair helpers de input (`S`)
Mover todas as funções puras de manipulação de string para `src/lib/parser/input-mutations.ts`:

```/dev/null/after.txt#L1-8
src/lib/parser/input-mutations.ts  ← NOVO
  insertChipToken()
  removeChipToken()
  stripGlobalSectionTokens()
  stripModifierTokensByKind()
  setScopedStageToken()
  setHpPercentageToken()
  toCanonicalScopeToken()
```

São funções **puras** (entrada string → saída string), fáceis de testar com Jest sem montar nenhum componente.

#### Passo 2 — Extrair auto-global logic (`S`)
Mover para `src/lib/parser/auto-global-tokens.ts`:

```/dev/null/after.txt#L1-6
src/lib/parser/auto-global-tokens.ts  ← NOVO
  deriveAutoGlobalState()
  applyAutoGlobalTokens()
  buildRecommendedGlobalOptions()
  prioritizeRecommendedGlobals()
  type AutoFieldCategory
```

#### Passo 3 — Encapsular o scheduler (`M`)
Substituir os 4 `let` globais por uma classe/objeto com interface clara:

```/dev/null/scheduler.ts#L1-15
// src/store/omni-scheduler.ts  ← NOVO
export interface OmniScheduler {
  scheduleCompute(version: number, fn: () => void, debounceMs?: number): void;
  scheduleCalculation(fn: () => void): void;
  cancelAll(): void;
  readonly currentVersion: number;
  bump(): number;
}

export function createOmniScheduler(): OmniScheduler { ... }
```

Isso elimina o estado mutável do módulo, torna o scheduler testável com mocks e remove a dependência implícita em `window`.

#### Passo 4 — Extrair `computeState` para `src/lib/omni-computation.ts` (`S`)
`computeState` não depende do Zustand — recebe parâmetros e retorna um snapshot de estado. Pode ser um módulo independente totalmente coberto por testes unitários.

#### Resultado esperado

| Antes | Depois |
|---|---|
| 1 arquivo · 1.040 linhas | 5 arquivos · ~200 linhas cada |
| 0 testes de input-mutations | ~20 testes unitários novos |
| Estado mutável global | Scheduler encapsulado e mockável |

---

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

O componente principal `PokemonSideSummary` com 880 linhas de JSX faz tudo:

- Resolução de espécie/set/forma
- Cálculo e display de stats com stage boosts + item boosts
- Editor inline de SPs (por stat individual, com debounce e validação)
- Gerenciamento de sets importados (lista, select, remove)
- Modal de edição completo (`PokemonSetEditorModal`)
- Switch de mega evolução
- Exibição de sprite com fallback
- Chips de move
- Reconstrução do prompt (`rebuildInputWithSpecies`, `rebuildInputWithStatPoints`)

O `summary` calculado dentro do componente é um objeto derivado de ~240 linhas que roda no render — é o lugar errado para derivação de dados.

### Plano de Refatoração

#### Passo 1 — Extrair derivação de dados para hook (`M`)

```/dev/null/hook.ts#L1-15
// src/components/omnibar/use-pokemon-summary.ts  ← NOVO
export function usePokemonSummary(side: "attacker" | "defender") {
  // toda a lógica do bloco `summary` (~240 linhas)
  // retorna: { name, pokemonId, stats, stageBoosts, itemBoosts,
  //            ability, move, item, nature, spriteSources,
  //            importedSet, effectiveSet, hasCustomStats, ... }
}
```

Isso permite memoização granular com `useMemo` por campo e evita recomputar todo o bloco quando só o cursor mudou.

#### Passo 2 — Extrair componentes visuais (`M`)

```/dev/null/components.txt#L1-10
PokemonStatRow.tsx      ← StatItem extraído e isolado
PokemonSpriteCard.tsx   ← PokemonSprite + título + item badge
PokemonMoveChips.tsx    ← MoveChip list
PokemonSetList.tsx      ← Lista de sets salvos com select/remove
PokemonSpEditor.tsx     ← Editor inline de SPs com os sliders
```

#### Passo 3 — Extrair rebuild-input helpers para `src/lib/parser/input-mutations.ts` (`S`)

`rebuildInputWithSpecies` e `rebuildInputWithStatPoints` são funções puras que pertencem à camada de parser, não ao componente. Movê-las também beneficia o Tópico 1.

#### Passo 4 — Reduzir o componente principal (`M`)

Após as extrações, `PokemonSideSummary` deve ter ~150 linhas: apenas orquestração entre sub-componentes, usando o hook.

#### Impacto em Performance

O bloco `summary` atual recalcula **tudo** a cada render do componente pai. Com o hook + `useMemo` granular:

- Re-renders causados por mudança de cursor no textarea não vão recalcular stats
- A lista de sets importados só re-renderiza quando `importedSets` muda
- Animações de sprite não forçam recálculo de stats

---

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

A função `getSlotSuggestions` (~500 linhas) tem **15 blocos if/early-return** independentes, cada um responsável por um tipo de sugestão diferente (Pokémon atacante, move, item, ability, modificadores, separador, Pokémon defensor, etc.). Não há como testar um caminho sem executar todos os anteriores.

### Plano de Refatoração

#### Passo 1 — Definir interface de slot-resolver (`S`)

```/dev/null/types.ts#L1-8
// Cada "resolver" é uma função pura e testável individualmente
type SlotResolver = (ctx: SuggestionContext) => AutocompleteResult | null;

interface SuggestionContext {
  structure: CommandStructure;
  activeToken: LexToken | null;
  trailingWhitespace: boolean;
  importedSets: Record<string, ImportedSet>;
  // ... outros campos necessários
}
```

#### Passo 2 — Extrair cada bloco em seu próprio arquivo (`M`)

```/dev/null/resolvers.txt#L1-12
src/lib/parser/resolvers/
  attacker-species-resolver.ts
  attacker-move-resolver.ts
  attacker-ability-resolver.ts
  attacker-item-resolver.ts
  attacker-modifier-resolver.ts
  separator-resolver.ts
  defender-species-resolver.ts
  defender-ability-resolver.ts
  defender-item-resolver.ts
  defender-modifier-resolver.ts
  global-modifier-resolver.ts
```

#### Passo 3 — Orquestrar com pipeline (`S`)

```/dev/null/pipeline.ts#L1-10
// getSlotSuggestions vira:
const RESOLVERS: SlotResolver[] = [
  resolveAttackerSpecies,
  resolveAttackerMove,
  // ...
];

export function getSlotSuggestions(ctx: SuggestionContext) {
  for (const resolve of RESOLVERS) {
    const result = resolve(ctx);
    if (result) return result;
  }
  return DEFAULT_RESULT;
}
```

#### Benefício

Cada resolver passa a ter seus próprios testes isolados. Um bug em "item do defensor" não exige debugar todo o pipeline.

---

## Tópico 4 — Robustez da Pipeline de Dados

**Arquivos:** `scripts/generate-static-data.ts`, `scripts/generate-vgc-meta.ts`

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟠 P1 |
| **Impacto no código** | ⚡ Médio |
| **Impacto em performance** | ➡️ Baixo (build-time apenas) |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | M (4–8h) |

### Problema

Os scripts dependem do HTML de Pikalytics e Serebii. Qualquer mudança no layout quebra silenciosamente — o script termina com código 0 mas gera dados corrompidos ou vazios.

### Plano

#### Passo 1 — Adicionar validação de saída (`S`)

Após geração, validar invariantes mínimas antes de escrever os arquivos:

```/dev/null/validation.ts#L1-12
// No final de cada script:
function validatePokemonSnapshot(data: PokemonEntry[]) {
  const MIN_LEGAL_SPECIES = 400;
  if (data.length < MIN_LEGAL_SPECIES) {
    throw new Error(`Geração abortada: apenas ${data.length} espécies (esperado >= ${MIN_LEGAL_SPECIES})`);
  }
  const missingStats = data.filter(p => !p.baseStats?.hp);
  if (missingStats.length) {
    throw new Error(`${missingStats.length} entradas sem baseStats`);
  }
  // ... mais checks
}
```

#### Passo 2 — Adicionar diff de integridade (`S`)

Antes de sobrescrever, comparar contagens entre o snapshot existente e o novo:

```/dev/null/diff.ts#L1-8
const existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
const delta = Math.abs(existing.length - generated.length);
const THRESHOLD = 10;
if (delta > THRESHOLD) {
  console.warn(`AVISO: diff de ${delta} entradas vs snapshot anterior.`);
  // Opcional: exigir flag --force para sobrescrever
}
```

#### Passo 3 — Separar scraping de transformação (`M`)

```/dev/null/structure.txt#L1-8
scripts/
  fetch/
    fetch-pikalytics.ts    ← só HTTP + parse HTML
    fetch-serebii.ts       ← só HTTP + parse HTML
  transform/
    build-pokemon-data.ts  ← só transformação de dados
    build-vgc-meta.ts      ← só transformação de dados
  generate-static-data.ts  ← orquestrador (chama fetch + transform)
```

Isso permite testar as transformações com fixtures locais sem depender de rede.

#### Passo 4 — CI mensal opcional via GitHub Actions (`S`)

```/dev/null/workflow.yml#L1-15
# .github/workflows/data-freshness.yml
name: Data freshness check
on:
  schedule:
    - cron: "0 9 1 * *"   # 1° de cada mês
  workflow_dispatch:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run generate:all
      - name: Fail if data changed significantly
        run: git diff --stat src/data/ | grep -E "^\s+\d+" | awk '{if ($1 > 50) exit 1}'
```

---

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

A lista de Pokémon legais para a Regulation M-A é mantida manualmente baseando-se em consulta humana ao Serebii. Pokémon legais mas de baixo uso podem ser omitidos silenciosamente.

### Plano

#### Passo 1 — Integrar verificação automática no script de geração (`S`)

`generate-static-data.ts` já busca a regulação do Serebii para as mega abilities. Expandir para também verificar o roster:

```/dev/null/check.ts#L1-12
// Ao final de generate-static-data.ts:
const liveRoster = await fetchSerebiiRegulationRoster();
const localRoster = new Set(regulationMA.allowedPokemonIds);
const missingFromLocal = liveRoster.filter(id => !localRoster.has(id));
const extraInLocal = [...localRoster].filter(id => !liveRoster.has(id));

if (missingFromLocal.length || extraInLocal.length) {
  console.warn("regulation-m-a.json pode estar desatualizado:");
  if (missingFromLocal.length) console.warn("  + faltando:", missingFromLocal);
  if (extraInLocal.length)    console.warn("  - extras:", extraInLocal);
}
```

#### Passo 2 — Adicionar `allowedPokemonIds` checksum no `active.json` (`XS`)

```/dev/null/active.json#L1-6
{
  "regulationId": "regulation-m-a",
  "rosterHash": "sha256:a1b2c3...",  ← hash do array sorted
  "lastVerified": "2025-07-01"
}
```

Permite detectar rapidamente se a regulação local diverge do que foi verificado pela última vez.

---

## Tópico 6 — Resiliência dos Sprites

**Arquivo:** `src/components/omnibar/pokemon-side-summary.tsx` (função `getSpriteSources`)

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟡 P2 |
| **Impacto no código** | 💧 Baixo |
| **Impacto em performance** | ➡️ Baixo |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | S (2–4h) |

### Problema

O componente `PokemonSprite` tenta fontes externas (Showdown CDN → PokemonDB) sem um estado visual de fallback. Se ambas falharem, o espaço fica vazio sem nenhuma indicação visual para o usuário.

### Plano

#### Passo 1 — Adicionar placeholder SVG/canvas como último fallback (`S`)

```/dev/null/fallback.tsx#L1-15
// Quando todas as srcs falharem, renderizar um placeholder com as
// iniciais do Pokémon e a cor do tipo primário
function PokemonSpriteFallback({ name, type }: { name: string; type: string }) {
  const color = TYPE_COLORS[type] ?? "#888";
  return (
    <div
      style={{ background: color, ... }}
      className="flex items-center justify-center rounded-full text-white font-bold"
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
```

#### Passo 2 — Extrair `PokemonSprite` para componente independente com seus próprios testes (`S`)

O componente `PokemonSprite` atual tem estado local (`spriteIndex`) mas está embarcado em 1300 linhas de componente. Extrair e testar o ciclo de fallback independentemente.

---

## Tópico 7 — Cobertura de Testes

**Arquivos:** `src/lib/parser/`, `src/lib/calc/`, `src/store/`

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟡 P2 |
| **Impacto no código** | 🔥 Alto (reduz risco de regressão em todos os outros tópicos) |
| **Impacto em performance** | ➡️ Baixo |
| **Risco de regressão** | ✅ Baixo |
| **Esforço estimado** | L (1–2 dias) |

### Problema

Os testes existentes cobrem bem os caminhos principais (`command-parser`, `damage-engine`, `inline-suggestions`, `omnibar.test.tsx`). As lacunas críticas são:

| Área | Cobertura atual | Problema |
|---|---|---|
| `input-mutations` (funções do store) | 0% | São funções puras, trivialmente testáveis |
| `auto-global-tokens` | ~20% (via omnibar.test.tsx integração) | Testado via UI, não unitariamente |
| `stat-calc.ts` (clamp, conversão) | ~30% (`stat-calc.test.ts` parcial) | Edge cases de overflow de SPs |
| `loaders.ts` | ~40% (`loaders.test.ts` parcial) | `resolveMegaEvolution`, sprite slugs |
| `archetypes.ts` | 0% | Lógica de bulk archetype não testada |

### Plano

#### Passo 1 — Testar `archetypes.ts` (`S`)

```/dev/null/archetypes.test.ts#L1-15
describe("getArchetypeConfigs", () => {
  test("returns 3 configs for any pokemon and move category", ...);
  test("tank prefers Def investment for physical moves", ...);
  test("tank prefers SpD investment for special moves", ...);
  test("custom nature overrides the tank default nature", ...);
  test("max_def investment forces Def tank regardless of move category", ...);
  test("max_spd investment forces SpD tank regardless of move category", ...);
});
```

#### Passo 2 — Testar `stat-calc.ts` edge cases (`S`)

```/dev/null/stat-calc.test.ts#L1-10
// Adicionar ao stat-calc.test.ts existente:
test("clampStatPoints reduz excess de trás pra frente (spe -> hp)", ...);
test("evsToStatPoints arredonda corretamente 4 EVs -> 0 SPs", ...);
test("statPointsToCalcEvs nunca excede 252", ...);
test("sumStatPoints nunca excede 66 após clamp", ...);
```

#### Passo 3 — Testar input-mutations após Tópico 1 (`M`)

Após extrair as funções puras do store, cada uma ganha seus próprios testes de unidade. Estimativa: ~20 testes novos, ~5 min de suite total.

#### Passo 4 — Cobertura de threshold via Jest config (`XS`)

```/dev/null/jest.config.ts#L1-8
// Adicionar ao jest.config.ts:
coverageThreshold: {
  "src/lib/": {
    lines: 70,
    functions: 70,
  },
}
```

---

## Tópico 8 — Estado Mutável de Módulo no Store

**Arquivo:** `src/store/use-omni-store.ts` (linhas 93–97)

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟠 P1 (resolve-se junto com Tópico 1) |
| **Impacto no código** | ⚡ Médio |
| **Impacto em performance** | ↗️ Médio |
| **Risco de regressão** | ✅ Baixo (melhora estabilidade) |
| **Esforço estimado** | M (parte do Tópico 1, Passo 3) |

### Problema

Os 4 `let` no escopo do módulo:

```/dev/null/problem.ts#L1-5
let scheduledComputeFrame: number | null = null;    // ← mutável global
let scheduledComputeVersion = 0;                     // ← mutável global
let scheduledCalculationHandle: number | null = null;// ← mutável global
let scheduledCalculationMode: "idle" | "timeout" | null = null; // ← mutável global
```

- São **compartilhados entre todos os testes** que importam o módulo — um teste pode vazar estado para o próximo.
- Se o app for montado duas vezes (ex: StrictMode), pode haver race condition.
- Impossível resetar sem um `resetOmniStore()` manual (que já existe, mas não reseta essas variáveis).

### Solução

Encapsular no scheduler (Tópico 1 · Passo 3). Adicionar `scheduler.reset()` ao `resetOmniStore()`.

---

## Tópico 9 — Comparação de Múltiplos Matchups (UX)

**Área:** Nova funcionalidade com débito de arquitetura

| Atributo | Valor |
|---|---|
| **Prioridade** | 🟢 P3 |
| **Impacto no código** | 🔥 Alto (requer refatoração do store) |
| **Impacto em performance** | ↗️ Médio |
| **Risco de regressão** | ⚠️ Médio |
| **Esforço estimado** | XL (5+ dias) |

### Problema

O store atual é uma **máquina de estado singleton** — um único input, um único resultado. Para adicionar comparação de múltiplos matchups (ex: "quanto cada atacante faz nesse defensor"), o modelo mental do store precisaria mudar.

### Plano (design apenas, não execução imediata)

#### Opção A — Store com lista de abas (`tabs`)

```/dev/null/store.ts#L1-10
interface OmniStore {
  tabs: OmniTab[];
  activeTabId: string;
  // ... todas as actions recebem tabId opcional
}

interface OmniTab {
  id: string;
  input: string;
  results: DamageResult[];
  // ...
}
```

#### Opção B — Múltiplos atacantes, mesmo defensor

```/dev/null/store.ts#L1-8
interface OmniStore {
  defender: DefenderState;        // um defensor fixado
  attackers: AttackerRow[];       // lista de atacantes/moves
}
```

**Recomendação:** Fazer os Tópicos 1 e 2 antes de começar o 9, pois a decomposição do store é pré-requisito para qualquer dessas abordagens ser viável sem introduzir mais débito.

---

## Roadmap Consolidado

```/dev/null/roadmap.txt#L1-38
SPRINT 1 (1 semana) — Redução de superfície crítica
  [P0] Tópico 1 · Passo 1: Extrair input-mutations.ts
  [P0] Tópico 1 · Passo 2: Extrair auto-global-tokens.ts
  [P1] Tópico 8: Estado mutável → scheduler (junto com T1-P3)
  [P1] Tópico 4 · Passo 1+2: Validação e diff de integridade nos scripts

SPRINT 2 (1 semana) — Decomposição do store e componente central
  [P0] Tópico 1 · Passo 3+4: Scheduler + computeState extraídos
  [P0] Tópico 2 · Passo 1: Hook usePokemonSummary
  [P0] Tópico 2 · Passo 3: Mover rebuild helpers para parser

SPRINT 3 (1 semana) — Componentes e testes
  [P0] Tópico 2 · Passo 2+4: Sub-componentes visuais + limpeza final
  [P1] Tópico 3 · Passo 1+2: Slot resolvers independentes
  [P2] Tópico 7 · Passos 1+2: Testes de archetypes + stat-calc

SPRINT 4 (1 semana) — Qualidade e resiliência
  [P1] Tópico 3 · Passo 3: Pipeline de resolvers + testes unitários
  [P1] Tópico 5: Verificação de regulação no script + checksum
  [P2] Tópico 6: Fallback de sprite + PokemonSprite isolado
  [P2] Tópico 7 · Passos 3+4: Testes de input-mutations + coverage threshold
  [P2] Tópico 4 · Passos 3+4: Refactor fetch/transform + CI mensal

FUTURO — Quando os fundamentos estiverem sólidos
  [P3] Tópico 9: Múltiplos matchups (design + implementação)
```

---

## Impacto Agregado Esperado

| Métrica | Antes | Depois (Sprints 1–4) |
|---|---|---|
| Maior arquivo do projeto | 1.366 linhas | ~200 linhas |
| Funções puras sem testes | ~30 | ~5 |
| Estado mutável de módulo | 4 variáveis globais | 0 |
| Risco de regressão em data pipeline | Alto (silencioso) | Médio (detectado com erro) |
| Tempo para onboarding de novo dev | Alto | Médio |
| Testabilidade do scheduler | Impossível | Totalmente mockável |

---

O plano está estruturado de forma que cada sprint entrega valor independente — se o Sprint 1 for concluído e o 2 não, o projeto já está num estado melhor do que antes. As extrações do Tópico 1 são o desbloqueador mais importante porque habilitam testes unitários para código que hoje só pode ser testado via integração de componente.
