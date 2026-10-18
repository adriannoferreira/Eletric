# Regras da Equatorial Pará (baixa tensão)

Dados estruturados e funções puras extraídos dos PDFs oficiais da Equatorial Pará.
Nenhum texto integral das normas é guardado aqui, só valores com citação (norma, revisão, item ou tabela) e o link oficial (`normas.ts`).

| Norma | Revisão | Uso no app |
|---|---|---|
| NT.00001.EQTL – Fornecimento em Baixa Tensão | 09 (homologada em 22/05/2025) | limites, Tabela 2, Tabelas 3 a 5, padrão de entrada, aterramento, estudos |
| NT.00030.EQTL – Caixas de Medição e Proteção | 05 | classificação e grau de proteção das caixas |
| NT.00045.EQTL – Postes para Padrão de Entrada | 01 | postes auxiliares |
| NT.00042.EQTL – Recarga de Veículos Elétricos | 04 | DR, DPS e projeto do carregador |
| NT.00020.EQTL – Micro e Minigeração Distribuída | 06 | potência disponibilizada, documentos e memorial |

## Arquivos

- `fornecimento.ts`
  - Contém `LIGACOES_PA`, `RESTRICOES`, `TABELA_2`, `categoriaAtendimento()` e `potenciaDisponibilizadaKVA()`.
- `demanda.ts`
  - Contém `TABELA_3`, `fatorTabela4()` e `calcularDemandaEquatorial()`.
  - A rev. 09 dimensiona o padrão pela **carga instalada**. O item 6.4 (roteiro de demanda) não aparece no texto publicado, então a demanda aqui é uma estimativa auxiliar. Ela só entra no critério de estudo do item 5.5.1.1 (trifásico com 22 kVA ou mais).
- `padrao.ts`
  - Contém `REQUISITOS_PADRAO`, `materiaisPadrao()`, `checklistVistoria()` e `DOCUMENTOS_LIGACAO`.
- `memorial.ts`
  - Contém `EXIGENCIAS_DOCUMENTOS`, `montarMemorialDescritivo()` e `preencherMemorial()`.
- `temas.ts`
  - Conteúdo da página `/normas`, mais a busca `buscarNasNormas()`.
- `prompt.ts`
  - Bloco fixo `BLOCO_PROMPT_EQUATORIAL`, que já vai anexado ao `PROMPT_ELETRICA`.

## Integração com o gerador de projeto e o construtor de quadros

O código fica em `src/lib/eletrica/projeto.ts`, `concessionarias.ts` e `src/components/quadro/**`.

1. **Categoria de atendimento.** Quando a concessionária do projeto for a Equatorial Pará:
   - Monte as cargas para `calcularDemandaEquatorial()`.
     - Circuitos de iluminação e TUG entram como `iluminacao_tomadas`.
     - TUE entra como `aparelho`, `ar_condicionado` ou `motor`.
     - Use fator de potência 1 no mono/bi e 0,92 no tri.
   - Monte os equipamentos para `categoriaAtendimento(cargaInstaladaKW, demandaKVA, equipamentos)`.
     - Circuito `FF` vira `fases: 2`.
     - Circuito `3F` vira `fases: 3`.
     - Motores levam `cv`; aparelhos levam `kva = W / 1000`.
   - Use o resultado no lugar dos limites genéricos marcados "conferir" em `concessionarias.ts`:
     - `tipo`, `tensao` e `linha.disjuntorA`;
     - `linha.condutorCliente`, `linha.eletrodutoAco` e `linha.aterramentoMm2`;
     - `estudos`, `bloqueios` e `avisos`.
   - Exiba `referencias` junto do resultado.
2. **Disjuntor geral do QDC.** O disjuntor geral do quadro não deve ser maior que o do padrão (`linha.disjuntorA`). A NT.00001 notifica proteção acima da Tabela 2 (item 6.3.8.6).
3. **Lista de materiais / orçamento.** `materiaisPadrao(tipo, linha, montagem)` devolve os itens do padrão que são por conta do cliente, com `busca` para achar o preço no catálogo. O ramal e o medidor são da Equatorial.
4. **Memorial descritivo.** Na aba Projeto e no PDF, o botão **"Gerar memorial descritivo"** deve:
   1. Montar `DadosMemorial`:
      - obra, cliente e endereço;
      - `perfil` como responsável (nome, registro, telefone, e-mail, nº da ART/TRT se houver);
      - `categoria` e `demanda` dos itens acima;
      - `montagem` do padrão;
      - `quadros`, com circuitos já calculados pelo motor: nº, descrição, W, V, seção, disjuntor, DR e fase;
      - DPS, DR e esquema de aterramento;
      - `temGeracao` e `temRecargaVE`.
   2. Chamar `montarMemorialDescritivo(dados)`. Ele devolve `secoes` e `markdown`, com tudo o que é determinístico já preenchido.
   3. Para cada seção com `paraIA`, pedir à IA só aquele texto: `POST /api/ia/gerar` com `assistente: "eletrica"`, enviando `paraIA.instrucao` e um resumo dos dados.
   4. Juntar com `preencherMemorial(markdown, { "descricao-geral": …, criterios: …, consideracoes: … })`. Marcadores sem resposta continuam no texto como `<!-- IA:id -->`.
   5. Salvar em `QuadroDados.memorial` e imprimir.
      - **Formato da Equatorial** (só obrigatório com GD — NT.00020, item 5.13.1): A4, assinado e digitalizado pelo responsável técnico, até 5 MB, nome do arquivo "Memorial Técnico Descritivo".
      - Mostre `EXIGENCIAS_DOCUMENTOS` na tela.
      - Deixe claro que UC individual em BT sem GD não apresenta projeto à Equatorial (NT.00001, item 5.2). Nesse caso o memorial serve ao cliente e à ART/TRT.

## Pontos ambíguos no texto extraído

- **Numeração das notas da Tabela 2.** A tabela remete às "Notas 24/25", mas o texto delas aparece como Notas 20 e 21. O app cita o conteúdo.
- **Item 6.4.** Consta no sumário, mas não há texto ("Erro! Indicador não definido").
- **Potência disponibilizada no bifásico.** A NT.00020 usa NF 1 ou √3. No bifásico 220/127 V o app usa I × 220 V com NF 1; conferir com a Equatorial.
- **Grau de proteção da caixa.** IP54 na NT.00001, item 6.3.6 c, e IP43 mínimo na NT.00030, item 5.2.4. O app mostra os dois.
- **Remissões a tabelas.** A NT.00001 cita "TABELA 13" para postes, mas a tabela de postes é a 9, e cita "TABELA 12" para tensões por estado. O app cita a tabela pelo conteúdo.
