# Sintaxe do Prompt do Omniboost

Este documento define a sintaxe canônica do prompt usado pelo Omniboost.

## Visão Geral

O Omniboost usa uma gramática compacta, segmentada por lados:

- tudo antes de `x` ou `vs` pertence ao atacante
- tudo depois de `x` ou `vs` pertence ao defensor
- tokens iniciados com `~` são sempre globais
- somente o nome do Pokémon é texto livre
- todo o resto deve seguir a gramática abaixo

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

É o trecho antes do separador `x` ou `vs`.

Exemplo:

```txt
politoed !muddy-water @mystic-water +1 +nature
```

### Segmento do defensor

É o trecho depois do separador `x` ou `vs`.

Exemplo:

```txt
incineroar @assault-vest %75 reflect
```

### Tokens globais

Qualquer token que começa com `~` é global, independente da posição.

Exemplo:

```txt
~rain
~trick-room
```

### Crítico

O token `*` representa golpe crítico. Ele é interpretado globalmente e pode ser escrito em qualquer ponto do prompt.

Exemplo:

```txt
politoed !muddy-water * x incineroar
```

## Separador

O sistema aceita:

- `x`
- `vs`

O separador canônico recomendado é `x`.

Exemplo:

```txt
politoed !muddy-water x incineroar
```

## Tokens Canônicos

### 1. Pokémon

O nome do Pokémon é o único elemento de texto livre.

Exemplos:

```txt
politoed
incineroar
charizard-mega-y
```

Observações:

- o sistema usa fuzzy match para ajudar com nomes digitados parcialmente ou com pequenos erros
- formas especiais podem ser escritas no formato canônico com hífen, como `charizard-mega-y`

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

- somente o atacante pode ter `!move`
- o move é obrigatório para o cálculo
- o move usa slug com hífens

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

- `#set` pode ser usado no slot de Pokémon do atacante ou do defensor
- ele resolve um set salvo ou compartilhado pelo apelido (`nickname`) ou pelo `speciesId`
- quando um `#set` é resolvido, o sistema usa a espécie e os dados do set salvo
- tokens explícitos no prompt continuam tendo prioridade sobre o que veio do set referenciado

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

- `@item` vale para o segmento onde ele foi escrito
- portanto, pode ser usado tanto no atacante quanto no defensor

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

- `N` deve estar entre `1` e `100`
- `%N` vale para o segmento onde ele foi escrito

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

- a ability vale para o segmento onde ela foi escrita
- ao digitar `[` na UI, o sistema fecha automaticamente para `[]` e coloca o cursor no meio

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
- o total não pode passar de `66`
- o token vale para o segmento onde ele foi escrito

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

- `~efeito` é sempre global
- weather e terrain vindos de abilities como `Drizzle`, `Drought` ou `Grassy Surge` não são mais inseridos automaticamente no prompt
- em vez disso, o sistema oferece o `~token` correspondente como sugestão opt-in

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

Tokens de segmento são escritos sem prefixo extra. O sistema entende se pertencem ao atacante ou ao defensor pela posição no prompt.

## Modificadores do Atacante

### Multiplicadores ofensivos

Faixa suportada:

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

- se o move for físico, afeta `Atk`
- se o move for especial, afeta `SpA`

### Multiplicadores de Speed

Faixa suportada:

```txt
spe+1 até spe+6
spe-1 até spe-6
```

Exemplos:

```txt
spe+2
spe-6
```

Esses tokens são relevantes para golpes que dependem de Speed, como:

- `Electro Ball`
- `Gyro Ball`

### Nature

Sintaxe:

```txt
+nature
-nature
```

Interpretação no atacante:

- `+nature`: nature ofensiva positiva
- `-nature`: nature ofensiva negativa

Mapeamento atual:

- move físico:
  - `+nature` => `Adamant`
  - `-nature` => `Modest`
- move especial:
  - `+nature` => `Modest`
  - `-nature` => `Adamant`

### Investimento ofensivo

Tokens suportados:

```txt
max-atk
max-spa
```

### Efeitos de suporte ofensivo

Tokens suportados:

```txt
helping-hand
tailwind
battery
power-spot
```

## Modificadores do Defensor

### Multiplicadores defensivos

Faixa suportada:

```txt
+1 até +6
-1 até -6
```

Interpretação:

- se o move do atacante for físico, afeta `Def`
- se o move do atacante for especial, afeta `SpD`

### Multiplicadores de Speed

Faixa suportada:

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

- `+nature`: nature defensiva positiva
- `-nature`: nature defensiva negativa

Mapeamento atual:

- contra move físico:
  - `+nature` => `Bold`
  - `-nature` => `Mild`
- contra move especial:
  - `+nature` => `Calm`
  - `-nature` => `Rash`

### Investimento defensivo

Tokens suportados:

```txt
max-def
max-spd
```

### Efeitos defensivos

Tokens suportados:

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

### 1. Somente o atacante tem move

Exemplo válido:

```txt
politoed !muddy-water x incineroar
```

Exemplo inválido:

```txt
politoed !muddy-water x incineroar !flare-blitz
```

### 2. Itens, HP e abilities são posicionais

Isso significa que o mesmo token muda de dono conforme o lado:

```txt
politoed !muddy-water @mystic-water x incineroar
```

Aqui `@mystic-water` é do atacante.

```txt
politoed !muddy-water x incineroar @assault-vest
```

Aqui `@assault-vest` é do defensor.

### 3. Species é livre; o resto é gramática

Depois que o Pokémon é resolvido em um segmento, tokens soltos passam a ser interpretados como possíveis modificadores daquele lado, não como outro Pokémon.

## Exemplos Completos

### Exemplo mínimo

```txt
politoed !muddy-water x incineroar
```

### Exemplo com item em ambos os lados

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

- o cálculo exige `!move`


### Move no defensor

```txt
politoed !muddy-water x incineroar !flare-blitz
```

Motivo:

- o defensor não possui slot de move nesta gramática

## Como o Autocomplete Trabalha

O autocomplete é sensível ao slot atual do prompt.

Ordem de leitura:

1. Pokémon atacante
2. `!move`
3. tokens do atacante
4. separador `x`
5. Pokémon defensor
6. tokens do defensor
7. tokens globais

Isso evita ambiguidades como:

- sugerir um Pokémon quando o slot atual espera um move
- completar `blitz` para `blitzle` depois de `!flare-blitz`

## Sugestões Automáticas de Campo

Abilities que ativam weather ou terrain não alteram mais o prompt sozinhas.

Em vez disso:

- o sistema detecta a ability relevante
- calcula qual weather/terrain seria o aplicável
- oferece o `~token` correspondente como sugestão prioritária

Exemplo:

```txt
torkoal !heat-wave x incineroar
```

Pode sugerir:

```txt
~sun
```

mas o prompt só muda se o usuário aceitar a sugestão.

## Atalhos de Teclado Relacionados à Gramática

- `↑` / `↓`: navega pelas sugestões
- `Tab`: aceita a sugestão atual
- `Enter`: rola até os resultados quando já existe cálculo válido
- `Shift + Enter`: quebra de linha

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
