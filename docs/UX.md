# Regras de UX do Eletric

O app é um **auxiliar direto do eletricista**, usado no celular, na obra. Não é um manual.
O conteúdo técnico continua no app, mas fica **atrás de um toque** (divulgação progressiva).

## Regras

1. **Uma ação principal por tela** (botão `btn-primary`). As demais vão no menu `⋯` (`MenuAcoes`).
2. **Título curto, sem parágrafo explicativo.** Subtítulo só se couber em 1 linha (ex.: "Equatorial Pará").
   Explicação da tela vai no `(?)` do `Cabecalho` (`ajuda={...}`).
3. **Normas e "conferir" viram selos**: `Ref` para citação (`NBR 5410 9.5.2 ⓘ`) e **um único** `Conferir`
   por tela/bloco reunindo tudo o que deve ser conferido.
4. **Listas só com o essencial** (1 linha de título + 1 linha de meta). Detalhe ao tocar.
5. **Formulários enxutos**: só os campos obrigatórios/mais usados à vista; o resto em `MaisOpcoes`.
   Prefira `placeholder` curto a `dica` longa; explicação de campo vai em `Campo ajuda={...}`.
6. **Seções longas recolhíveis** (`Detalhes`), com a mais usada aberta.
7. **Avisos/alertas em linha** (ícone + 1 linha truncada + seta), agrupados num card — nada de banners de parágrafo.
8. **Segurança crítica fica visível**, mas em **uma linha curta** com ícone (ex.: "Bloqueie o comando antes de mexer (NR-10)").
   Detalhes no `(?)`.
9. Texto explicativo visível: **≤ 1 linha**. Estados vazios: só o título (sem parágrafo).
10. Números em grades de 1/3 da tela usam valores compactos (ex.: "R$ 4,4 mil").

## Componentes (`src/components/divulgacao.tsx`, client)

| Componente | Uso |
|---|---|
| `Ajuda` | Botão `(?)` que abre popover (notebook) / bottom sheet (celular). `<Ajuda titulo="...">texto</Ajuda>` |
| `Ref` | Selo de norma tocável. `<Ref norma="NBR 5410" item="9.5.2" href="...">detalhe</Ref>`; sem filhos vira selo simples |
| `Conferir` | Selo ⚠ único com a lista do que conferir. `<Conferir itens={[...]} />` |
| `Detalhes` | Seção recolhível em card. `<Detalhes titulo="Materiais" aberto>...</Detalhes>` |
| `MaisOpcoes` | Campos secundários recolhíveis dentro de formulários |
| `MenuAcoes` | Botão `⋯` com ações. `acoes=[{ rotulo, icone: <Icon />, href?, externo?, onClick?, perigo? }]` |

Notas:
- `MenuAcoes` recebe o **elemento** do ícone (`icone: <Bot />`), não o componente — assim funciona a partir de server components.
  `onClick` só pode ser usado dentro de client components.
- `Cabecalho` (`src/components/ui.tsx`) aceita `ajuda` e mantém as `acoes` na mesma linha do título.
- `Campo` aceita `ajuda` (abre `(?)` ao lado do rótulo).
- Acessibilidade: os painéis fecham com `Esc` e toque fora; botões têm `aria-label`/`aria-expanded`.

## Áreas ainda não revisadas

Quadros (`src/app/(app)/quadros/**`, `src/components/quadro/**`), Catálogo/Preços (`src/app/(app)/catalogo/**`,
`src/components/precos/**`) e Orçamentos (`src/app/(app)/orcamentos/**`) seguem as mesmas regras quando forem limpas.
Pontos óbvios a aplicar lá:
- citações "conferir na edição vigente" espalhadas → um `Conferir` por aba;
- textos de "como funciona" no topo das abas → `Ajuda`;
- abas de resultados longas (verificação, materiais, compras, inspeção) → `Detalhes` com resumo na linha do título;
- formulários de circuito/peça → `MaisOpcoes` para método de instalação, agrupamento, temperatura etc.
