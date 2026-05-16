# Sintaxe do Prompt do Unburden

Este documento define a sintaxe canônica dos prompts do Unburden.

Há duas gramáticas relacionadas:

1. **Calculadora de dano** em `/`
2. **Speed Benchmark** em `/speed`

Os tokens continuam em inglês/canônicos mesmo na interface em português.

---

## 1. Calculadora de dano `/`

### Forma mínima

```txt
{atacante} !{move} x {defensor}
```

Exemplo:

```txt
politoed !muddy-water x incineroar
```

### Forma completa

```txt
{atacante} !{move} [tokens do atacante...] x {defensor} [tokens do defensor...] [tokens globais...]
```

Exemplo:

```txt
politoed !muddy-water @mystic-water +1 x incineroar @assault-vest %75 light-screen ~rain
```

### Escopo

- Tudo antes de `x` ou `vs` pertence ao atacante.
- Tudo depois de `x` ou `vs` pertence ao defensor.
- Tokens que começam com `~` são globais e podem aparecer em qualquer lado.
- `*` marca crítico e também pode aparecer em qualquer lado.
- O nome do Pokémon é texto livre; o restante segue tokens explícitos.

Separadores aceitos:

```txt
x
vs
```

Separador recomendado:

```txt
x
```

---

## Tokens principais da calculadora de dano

### Pokémon

Nome livre, com fuzzy match.

Exemplos:

```txt
politoed
incineroar
charizard-mega-y
```

Formas especiais devem preferir o slug canônico quando houver ambiguidade.

### Referência a Set

Uma **Referência a Set** usa `#` para resolver um Set disponível no workspace, como um **Imported Set** ou **Shared Set**.

```txt
#set
```

Exemplos:

```txt
#raintoed
#avincin
```

Regras:

- Pode ocupar o slot de atacante ou defensor.
- Resolve preferencialmente por nickname.
- Pode resolver por espécie somente quando houver exatamente um Set atualmente acessível para aquela espécie.
- Se mais de um Set da mesma espécie existir, a referência por espécie deve gerar um problema de prompt em vez de escolher silenciosamente.
- Tokens explícitos no prompt têm prioridade sobre o Set referenciado.

### Move do atacante

```txt
!move
```

Exemplos:

```txt
!muddy-water
!flare-blitz
!electro-ball
```

Regras:

- Só o atacante tem move explícito.
- Move é obrigatório para calcular dano.
- O defensor não aceita `!move`.

### Multi-hit e parâmetros de move

Multi-hit explícito:

```txt
!bullet-seed(3)
!triple-axel[3]
```

Last Respects usa o parâmetro como stacks/fainted allies suportados pelo app:

```txt
!last-respects[3]
```

### Item

```txt
@item
```

Exemplos:

```txt
@mystic-water
@assault-vest
@life-orb
```

O item vale para o lado onde aparece.

### HP atual

```txt
%N
```

Exemplos:

```txt
%75
%50
%25
```

`N` deve ficar entre `1` e `100`.

### Ability explícita

```txt
[Ability Name]
```

Exemplos:

```txt
[Drizzle]
[Intimidate]
[Grassy Surge]
```

A ability vale para o lado onde aparece.

### SP spread de Champions

```txt
sp:hp/atk/def/spa/spd/spe
```

Exemplo:

```txt
sp:32/0/1/13/1/19
```

Regras:

- Sempre exige 6 valores.
- Cada valor vai de `0` a `32`.
- Total não pode passar de `66`.

### Crítico

```txt
*
```

Exemplo:

```txt
politoed !muddy-water * x incineroar
```

### Status

Tokens canônicos:

```txt
burn
paralysis
poison
sleep
freeze
```

Aliases aceitos:

```txt
brn
par
psn
slp
frz
```

O status vale para o lado onde aparece.

---

## Modificadores da calculadora de dano

### Stages relevantes por contexto

Tokens curtos:

```txt
+1 até +6
-1 até -6
```

Interpretação:

- No atacante: afeta Atk ou SpA conforme a categoria do move.
- No defensor: afeta Def ou SpD conforme a categoria do move.

### Stages nomeados

Também é possível indicar o stat diretamente:

```txt
atk+1
atk-1
def+1
def-1
spa+1
spa-1
spd+1
spd-1
```

### Speed stages

```txt
spe+1 até spe+6
spe-1 até spe-6
```

Aliases aceitos:

```txt
speed+1
speed-1
```

Útil para efeitos dependentes de Speed, como `Electro Ball` e `Gyro Ball`.

### Nature genérica

```txt
+nature
-nature
```

Interpretação no atacante:

- `+nature`: nature ofensiva positiva para a categoria do move.
- `-nature`: nature ofensiva negativa para a categoria do move.

Interpretação no defensor:

- `+nature`: nature defensiva positiva contra a categoria do move.
- `-nature`: nature defensiva negativa contra a categoria do move.

Aliases:

```txt
positive-nature
pos-nature
negative-nature
neg-nature
```

### Nature explícita

Natures por nome também são aceitas como tokens, por exemplo:

```txt
adamant
modest
bold
calm
timid
jolly
brave
sassy
```

### Investimento

Atacante:

```txt
max-atk
max-spa
```

Defensor:

```txt
max-def
max-spd
```

### Target do move em doubles

```txt
single-target
multi-target
```

Aliases aceitos para `multi-target`:

```txt
multi
double-target
spread
```

Use quando precisar forçar o modo de alvo de um move de spread/single-target no cálculo.

### Efeitos de suporte do atacante

```txt
helping-hand
tailwind
battery
power-spot
```

### Efeitos defensivos

```txt
reflect
light-screen
aurora-veil
protect
friend-guard
tailwind
```

### Efeitos globais

Sempre usam `~`.

Weather:

```txt
~rain
~sun
~sand
~snow
```

Terrain:

```txt
~electric-terrain
~grassy-terrain
~psychic-terrain
~misty-terrain
```

Outros:

```txt
~trick-room
~gravity
```

Abilities que ativam weather ou terrain não inserem o token sozinhas. O app pode sugerir o `~token`, mas o prompt só muda se o usuário aceitar.

---

## Exemplos da calculadora de dano

Mínimo:

```txt
politoed !muddy-water x incineroar
```

Item nos dois lados:

```txt
politoed !muddy-water @mystic-water x incineroar @assault-vest
```

HP atual e weather:

```txt
politoed !muddy-water x incineroar %75 ~rain
```

Stages, screen e crítico:

```txt
incineroar !flare-blitz +1 x tinkaton +nature reflect *
```

Stage nomeado:

```txt
gholdengo !make-it-rain spa+2 x incineroar spd+1
```

Speed relevante:

```txt
regieleki !electro-ball spe+6 x amoonguss spe-6
```

Ability explícita:

```txt
politoed !muddy-water [Drizzle] x incineroar [Intimidate]
```

Multi-hit:

```txt
breloom !bullet-seed(3) x primarina
```

Target forçado:

```txt
charizard !heat-wave single-target x tinkaton
```

Inválido porque falta move:

```txt
politoed x incineroar
```

Inválido porque o defensor não aceita move:

```txt
politoed !muddy-water x incineroar !flare-blitz
```

---

## 2. Speed Benchmark `/speed`

Speed Benchmark tem gramática própria. Ela não usa `!move` e não calcula dano.

### Forma com só o subject

```txt
{subject} [tokens do subject...] [globais...]
```

Exemplo:

```txt
basculegion @choice-scarf
```

Sem comparador explícito, o app compara contra a ladder/meta e foca o benchmark relevante mais próximo.

### Forma com comparador explícito

```txt
{subject} [tokens do subject...] x {comparador} [tokens do comparador...] [globais...]
```

Exemplos:

```txt
basculegion @choice-scarf x aerodactyl spe-1 tailwind
venusaur [Chlorophyll] ~sun x aerodactyl
basculegion spe-sp:20 x aerodactyl
```

### Escopo em `/speed`

- Tokens antes de `x` afetam o subject.
- Tokens depois de `x` afetam o comparador explícito.
- Tokens globais usam `~` e afetam o contexto global.
- `tailwind` é side-specific, não global.
- Edições são locais e não mutam sets importados/salvos.

### Tokens side-specific em `/speed`

Item:

```txt
@choice-scarf
choice scarf
```

Ability:

```txt
[Chlorophyll]
[Swift Swim]
[Unburden]
```

Nature de Speed:

```txt
+speed
-speed
neutral
```

Também são aceitos alguns aliases, como `+nature`, `-nature`, `jolly`, `timid`, `brave`, `relaxed`, `quiet`, `sassy`.

Speed SP:

```txt
spe-sp:0
spe-sp:20
spe-sp:32
```

Speed stage:

```txt
spe+1
spe-1
+1
-1
```

No `/speed`, stages curtos (`+1`, `-1`) significam Speed stage.

Outros modificadores:

```txt
tailwind
paralysis
par
unburden-active
```

`[Unburden]` apenas seleciona a ability. O boost exige `unburden-active`.

### Globais em `/speed`

```txt
~sun
~rain
~sand
~snow
~electric-terrain
~trick-room
```

Weather/terrain ativam abilities condicionais quando aplicável, por exemplo:

- `[Chlorophyll] ~sun`
- `[Swift Swim] ~rain`
- `[Sand Rush] ~sand`
- `[Slush Rush] ~snow`
- `[Surge Surfer] ~electric-terrain`

`~trick-room` muda a semântica de quem move primeiro, mas a ladder continua ordenada por Speed efetiva.

### Comando canônico em `/speed`

A UI tenta manter o comando compacto:

- omite `spe-sp:32` quando é o default
- omite nature neutra quando não é override relevante
- canonicaliza natures de Speed para `+speed` / `-speed`
- canonicaliza globais no final

---

## Autocomplete

Atalhos principais:

- `↑` / `↓`: navega sugestões
- `Tab`: aceita sugestão atual
- `Enter`: confirma/avança quando aplicável
- `Escape`: fecha sugestões/modais quando aplicável
- `Shift + Enter`: quebra linha no prompt de dano

A calculadora de dano e o Speed Benchmark têm sugestões específicas para suas gramáticas.
