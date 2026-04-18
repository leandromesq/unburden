# Sintaxe do Prompt do Omniboost

Este doc define sintaxe canônica do prompt do Omniboost.

## Visão Geral

Omniboost usa gramática compacta, separada por lados:

- tudo antes de `x` ou `vs` = atacante
- tudo depois de `x` ou `vs` = defensor
- token que começa com `~` = global
- só nome do Pokémon é texto livre
- resto segue gramática abaixo

Estrutura base:

```txt
{atacante} !{move} [tokens do atacante...] x {defensor} [tokens do defensor...] [tokens globais...]
```

Exemplo:

```txt
politoed !muddy-water @mystic-water x incineroar @assault-vest %75 ~rain
```

## Regras de Escopo

### Segmento do atacante

Trecho antes de `x` ou `vs`.

Exemplo:

```txt
politoed !muddy-water @mystic-water +1 +nature
```

### Segmento do defensor

Trecho depois de `x` ou `vs`.

Exemplo:

```txt
incineroar @assault-vest %75 reflect
```

### Tokens globais

Todo token que começa com `~` = global, não importa posição.

Exemplo:

```txt
~rain
~trick-room
```

### Crítico

Token `*` = golpe crítico. Sistema trata como global. Pode aparecer em qualquer ponto.

Exemplo:

```txt
politoed !muddy-water * x incineroar
```

## Separador

Sistema aceita:

- `x`
- `vs`

Separador canônico recomendado = `x`.

Exemplo:

```txt
politoed !muddy-water x incineroar
```

## Tokens Canônicos

### 1. Pokémon

Nome do Pokémon = único elemento de texto livre.

Exemplos:

```txt
politoed
incineroar
charizard-mega-y
```

Observações:

- sistema usa fuzzy match para nomes parciais ou com erro pequeno
- formas especiais podem usar formato canônico com hífen, como `charizard-mega-y`

### 2. Move

Sintaxe:

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

- só atacante pode ter `!move`
- move é obrigatório para cálculo
- move usa slug com hífens

### 2.5. Referência a set salvo

Sintaxe:

```txt
#nome-do-set
```

Exemplos:

```txt
#raintoed
#avincin
```

Regras:

- `#set` pode ocupar slot do atacante ou do defensor
- resolve set salvo ou compartilhado por `nickname` ou `speciesId`
- quando `#set` resolve, sistema usa espécie e dados do set salvo
- token explícito no prompt ainda tem prioridade sobre dado vindo do set

### 3. Item

Sintaxe:

```txt
@item
```

Exemplos:

```txt
@mystic-water
@assault-vest
@life-orb
```

Regras:

- `@item` vale para segmento onde foi escrito
- pode aparecer no atacante ou no defensor

### 4. HP atual

Sintaxe:

```txt
%N
```

Exemplos:

```txt
%75
%50
%25
```

Regras:

- `N` entre `1` e `100`
- `%N` vale para segmento onde foi escrito

### 5. Ability explícita

Sintaxe:

```txt
[Ability Name]
```

Exemplos:

```txt
[Drizzle]
[Intimidate]
[Grassy Surge]
```

Regras:

- ability vale para segmento onde foi escrita
- ao digitar `[` na UI, sistema fecha para `[]` e põe cursor no meio

### 6. Spread de SPs

Sintaxe:

```txt
sp:hp/atk/def/spa/spd/spe
```

Exemplo:

```txt
sp:32/0/1/13/1/19
```

Regras:

- sempre exige 6 valores
- cada stat vai de `0` a `32`
- total não pode passar de `66`
- token vale para segmento onde foi escrito

### 7. Efeitos globais

Sintaxe:

```txt
~efeito
```

Exemplos:

```txt
~rain
~sun
~grassy-terrain
~trick-room
~gravity
```

Regras:

- `~efeito` sempre global
- weather e terrain vindos de abilities como `Drizzle`, `Drought`, `Grassy Surge` não entram mais no prompt sozinhos
- sistema oferece `~token` correspondente como sugestão opt-in

### 8. Crítico

Sintaxe:

```txt
*
```

Exemplo:

```txt
politoed !muddy-water * x incineroar
```

## Tokens de Segmento

Tokens de segmento não usam prefixo extra. Sistema decide se pertencem ao atacante ou defensor pela posição.

## Modificadores do Atacante

### Multiplicadores ofensivos

Faixa:

```txt
+1 até +6
-1 até -6
```

Exemplos:

```txt
+1
-2
+6
```

Interpretação:

- se move for físico, afeta `Atk`
- se move for especial, afeta `SpA`

### Multiplicadores de Speed

Faixa:

```txt
spe+1 até spe+6
spe-1 até spe-6
```

Exemplos:

```txt
spe+2
spe-6
```

Importante para golpes como:

- `Electro Ball`
- `Gyro Ball`

### Nature

Sintaxe:

```txt
+nature
-nature
```

Interpretação no atacante:

- `+nature` = nature ofensiva positiva
- `-nature` = nature ofensiva negativa

Mapeamento atual:

- move físico:
  - `+nature` => `Adamant`
  - `-nature` => `Modest`
- move especial:
  - `+nature` => `Modest`
  - `-nature` => `Adamant`

### Investimento ofensivo

Tokens:

```txt
max-atk
max-spa
```

### Efeitos de suporte ofensivo

Tokens:

```txt
helping-hand
tailwind
battery
power-spot
```

## Modificadores do Defensor

### Multiplicadores defensivos

Faixa:

```txt
+1 até +6
-1 até -6
```

Interpretação:

- se move do atacante for físico, afeta `Def`
- se move do atacante for especial, afeta `SpD`

### Multiplicadores de Speed

Faixa:

```txt
spe+1 até spe+6
spe-1 até spe-6
```

### Nature

Sintaxe:

```txt
+nature
-nature
```

Interpretação no defensor:

- `+nature` = nature defensiva positiva
- `-nature` = nature defensiva negativa

Mapeamento atual:

- contra move físico:
  - `+nature` => `Bold`
  - `-nature` => `Mild`
- contra move especial:
  - `+nature` => `Calm`
  - `-nature` => `Rash`

### Investimento defensivo

Tokens:

```txt
max-def
max-spd
```

### Efeitos defensivos

Tokens:

```txt
reflect
light-screen
aurora-veil
protect
friend-guard
tailwind
```

## Efeitos Globais Suportados

### Weather

```txt
~rain
~sun
~sand
~snow
```

### Terrain

```txt
~electric-terrain
~grassy-terrain
~psychic-terrain
~misty-terrain
```

### Outros field effects

```txt
~trick-room
~gravity
```

## Regras Importantes de Interpretação

### 1. Só atacante tem move

Válido:

```txt
politoed !muddy-water x incineroar
```

Inválido:

```txt
politoed !muddy-water x incineroar !flare-blitz
```

### 2. Itens, HP e abilities são posicionais

Mesmo token troca de dono conforme lado:

```txt
politoed !muddy-water @mystic-water x incineroar
```

Aqui `@mystic-water` = atacante.

```txt
politoed !muddy-water x incineroar @assault-vest
```

Aqui `@assault-vest` = defensor.

### 3. Species é livre. Resto é gramática

Depois que Pokémon resolve em segmento, token solto passa a ser interpretado como possível modificador daquele lado, não como outro Pokémon.

## Exemplos Completos

### Exemplo mínimo

```txt
politoed !muddy-water x incineroar
```

### Exemplo com item nos dois lados

```txt
politoed !muddy-water @mystic-water x incineroar @assault-vest
```

### Exemplo com HP atual e weather

```txt
politoed !muddy-water x incineroar %75 ~rain
```

### Exemplo com stages, screens e crítico

```txt
incineroar !flare-blitz +1 x tinkaton +nature reflect *
```

### Exemplo com Speed relevante

```txt
regieleki !electro-ball spe+6 x amoonguss spe-6
```

### Exemplo com ability explícita

```txt
politoed !muddy-water [Drizzle] x incineroar [Intimidate]
```

### Exemplo com mega forma explícita

```txt
charizard-mega-y !heat-wave x tinkaton
```

## Exemplos Inválidos

### Sem move explícito

```txt
politoed x incineroar
```

Motivo:

- cálculo exige `!move`

### Move no defensor

```txt
politoed !muddy-water x incineroar !flare-blitz
```

Motivo:

- defensor não tem slot de move nesta gramática

## Como o Autocomplete Trabalha

Autocomplete é sensível ao slot atual.

Ordem de leitura:

1. Pokémon atacante
2. `!move`
3. tokens do atacante
4. separador `x`
5. Pokémon defensor
6. tokens do defensor
7. tokens globais

Isso evita ambiguidades como:

- sugerir Pokémon quando slot atual espera move
- completar `blitz` para `blitzle` depois de `!flare-blitz`

## Sugestões Automáticas de Campo

Abilities que ativam weather ou terrain não alteram mais prompt sozinhas.

Em vez disso:

- sistema detecta ability relevante
- calcula weather/terrain aplicável
- oferece `~token` correspondente como sugestão prioritária

Exemplo:

```txt
torkoal !heat-wave x incineroar
```

Pode sugerir:

```txt
~sun
```

Mas prompt só muda se usuário aceitar sugestão.

## Atalhos de Teclado Relacionados à Gramática

- `↑` / `↓` - navega pelas sugestões
- `Tab` - aceita sugestão atual
- `Enter` - rola até resultados quando cálculo já é válido
- `Shift + Enter` - quebra de linha

## Resumo Rápido

Estrutura mínima:

```txt
pokemon !move x pokemon
```

Tokens principais:

```txt
#set
!move
@item
%75
[Ability]
~rain
*
+1 / -1
spe+1 / spe-1
+nature / -nature
max-atk / max-spa / max-def / max-spd
reflect / helping-hand / tailwind / protect / etc.
```

Forma recomendada:

```txt
politoed !muddy-water @mystic-water x incineroar @assault-vest %75 ~rain
```
