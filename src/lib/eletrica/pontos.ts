/**
 * Lista de pontos por ambiente: iluminação, interruptores, tomadas de uso geral (TUG)
 * e de uso específico (TUE), com o circuito/disjuntor de cada ponto, altura sugerida,
 * material e checklist de execução.
 *
 * Quantidades mínimas: ABNT NBR 5410 9.5.2 (iluminação 9.5.2.1; tomadas 9.5.2.2).
 * Alturas: PRÁTICA USUAL de mercado — a NBR 5410 não fixa alturas de tomadas e interruptores.
 */
import type { AnaliseQuadro, ResultadoCircuito } from "./calculo";
import { perimetroEfetivo, preverAmbientes, presetCarga } from "./projeto";
import { type Circuito, LOCAIS, type QuadroDados, TIPOS_AMBIENTE } from "./tipos";

export type TipoPonto = "luz" | "interruptor" | "tug" | "tue";
export type TipoInterruptor = "simples" | "paralelo" | "intermediario";

export const ROTULO_INTERRUPTOR: Record<TipoInterruptor, string> = {
  simples: "Interruptor simples",
  paralelo: "Interruptor paralelo (three-way)",
  intermediario: "Interruptor intermediário (four-way)",
};

export const ALTURAS = {
  baixa: "baixa ~0,30 m",
  media: "média ~1,10–1,20 m",
  alta: "alta ~2,00–2,20 m",
  interruptor: "~1,10–1,30 m",
  teto: "teto",
} as const;

export const AVISO_ALTURAS =
  "Alturas sugeridas: prática usual de mercado, não exigência da NBR 5410. Confirme com o cliente e o projeto de arquitetura.";

export const AVISO_BANHEIRO =
  "Banheiro: tomada e interruptor fora dos volumes 0, 1 e 2 — a mais de 0,60 m da borda do box/banheira (NBR 5410 9.1 — conferir na edição vigente). Chuveiro elétrico ligado diretamente, sem tomada.";

export interface CircuitoDoPonto {
  numero: number;
  nome: string;
  disjuntor: string;
  dr: boolean;
}

export interface Ponto {
  chave: string;
  tipo: TipoPonto;
  descricao: string;
  quantidade: number;
  /** Potência por ponto (VA ou W). */
  potencia: number | null;
  tensaoV: number | null;
  altura: string;
  circuito: CircuitoDoPonto | null;
  /** Para orçamento: kit sugerido do catálogo (chave dos kits sugeridos). */
  kit: "tomada-10a-embutida" | "tomada-20a-embutida" | "ponto-iluminacao" | "interruptor-simples" | "interruptor-paralelo" | "chuveiro-circuito" | "ar-condicionado" | null;
  nota?: string;
}

export interface MaterialPonto {
  descricao: string;
  unidade: string;
  quantidade: number;
}

export interface AmbientePontos {
  chave: string;
  nome: string;
  tipoNome: string;
  areaM2: number | null;
  perimetroM: number | null;
  interruptor: TipoInterruptor;
  pontos: Ponto[];
  materiais: MaterialPonto[];
  checklist: { id: string; texto: string }[];
  avisos: string[];
}

export interface ListaPontos {
  origem: "projeto" | "circuitos";
  ambientes: AmbientePontos[];
  totais: { pontosLuz: number; interruptores: number; tug: number; tue: number };
  materiais: MaterialPonto[];
}

const AMBIENTES_MEDIA = new Set(["area_servico", "lavanderia"]);
const AMBIENTES_BANCADA = new Set(["cozinha", "copa"]);

/** Altura sugerida da tomada de uso específico pelo tipo do aparelho. */
function alturaTUE(chaveOuNome: string) {
  const s = chaveOuNome.toLowerCase();
  if (/chuveiro/.test(s)) return { altura: `${ALTURAS.alta} (saída para o chuveiro)`, nota: "Ligação direta, sem tomada." };
  if (/\bar\b|ar-?cond|split/.test(s)) return { altura: ALTURAS.alta, nota: "Junto à evaporadora; tomada 2P+T 20 A ou ligação direta, conforme o fabricante." };
  if (/aquecedor|boiler/.test(s)) return { altura: ALTURAS.alta };
  if (/port[aã]o/.test(s)) return { altura: `${ALTURAS.alta} (junto ao motor)` };
  if (/microondas|micro-ondas/.test(s)) return { altura: "média ~1,30–1,60 m (nicho/armário)" };
  if (/forno|cooktop|fog[aã]o/.test(s)) return { altura: `${ALTURAS.baixa} (dentro do gabinete)` };
  if (/torneira/.test(s)) return { altura: "junto à torneira, conforme o fabricante" };
  if (/lava|secadora/.test(s)) return { altura: ALTURAS.media };
  return { altura: ALTURAS.media };
}

function kitTUE(nome: string, correnteA: number): Ponto["kit"] {
  if (/chuveiro/i.test(nome)) return "chuveiro-circuito";
  if (/\bar\b|ar-?cond|split/i.test(nome)) return "ar-condicionado";
  return correnteA > 10 ? "tomada-20a-embutida" : "tomada-10a-embutida";
}

function infoCircuito(analise: AnaliseQuadro, r: ResultadoCircuito | undefined): CircuitoDoPonto | null {
  if (!r) return null;
  return {
    numero: analise.circuitos.indexOf(r) + 1,
    nome: r.circuito.nome,
    disjuntor: r.pecaDisjuntor ? `${r.pecaDisjuntor.polos}P ${r.pecaDisjuntor.rotulo}` : "—",
    dr: r.temDR,
  };
}

/** Circuito que atende o ambiente: pelo vínculo salvo (ambienteIds) ou, nos quadros antigos, pelo nome. */
function acharCircuito(analise: AnaliseQuadro, ambienteId: string, nomeAmbiente: string, filtro: (c: Circuito) => boolean) {
  const lista = analise.circuitos.filter((r) => filtro(r.circuito));
  return (
    lista.find((r) => r.circuito.ambienteIds.includes(ambienteId)) ??
    lista.find((r) => r.circuito.ambienteIds.length === 0 && r.circuito.nome.includes(nomeAmbiente))
  );
}

function interruptorPadrao(tipoAmbiente: string, areaM2: number): TipoInterruptor {
  if (tipoAmbiente === "corredor") return "paralelo";
  return areaM2 > 30 ? "paralelo" : "simples";
}

function pontosLuzPadrao(areaM2: number) {
  return areaM2 <= 20 ? 1 : Math.ceil(areaM2 / 15);
}

function materiaisDoAmbiente(pontos: Ponto[], interruptor: TipoInterruptor, distanciaM: number | null): MaterialPonto[] {
  const soma = (t: TipoPonto) => pontos.filter((p) => p.tipo === t).reduce((s, p) => s + p.quantidade, 0);
  const luz = soma("luz");
  const inter = soma("interruptor");
  const tug = soma("tug");
  const tues = pontos.filter((p) => p.tipo === "tue");
  const tue10 = tues.filter((p) => p.kit === "tomada-10a-embutida").reduce((s, p) => s + p.quantidade, 0);
  const tue20 = tues.filter((p) => p.kit === "tomada-20a-embutida" || p.kit === "ar-condicionado").reduce((s, p) => s + p.quantidade, 0);
  const chuveiros = tues.filter((p) => p.kit === "chuveiro-circuito").reduce((s, p) => s + p.quantidade, 0);
  const total = luz + inter + tug + tues.reduce((s, p) => s + p.quantidade, 0);
  const itens: MaterialPonto[] = [
    { descricao: "Caixa octogonal 4x4 (teto)", unidade: "un", quantidade: luz },
    { descricao: "Caixa 4x2 de embutir", unidade: "un", quantidade: inter + tug + tue10 + tue20 + chuveiros },
    { descricao: `${ROTULO_INTERRUPTOR[interruptor]} com placa`, unidade: "un", quantidade: inter },
    { descricao: "Tomada 2P+T 10 A com placa", unidade: "un", quantidade: tug + tue10 },
    { descricao: "Tomada 2P+T 20 A com placa", unidade: "un", quantidade: tue20 },
    { descricao: "Conector/borne para ligação de chuveiro", unidade: "un", quantidade: chuveiros },
    {
      descricao: 'Eletroduto corrugado 3/4" (estimado)',
      unidade: "m",
      quantidade: Math.round((distanciaM ?? 0) + 3 * total),
    },
  ];
  return itens.filter((i) => i.quantidade > 0);
}

function checklistDoAmbiente(chave: string, pontos: Ponto[]) {
  const temDR = pontos.some((p) => p.circuito?.dr);
  return [
    "Marcar os pontos na parede/teto (alturas combinadas com o cliente)",
    "Fixar caixas (4x2, 4x4 e octogonais) no nível",
    "Passar eletrodutos até o quadro",
    "Passar e identificar os condutores (fase, neutro azul, PE verde-amarelo, retorno)",
    "Ligar tomadas (2P+T) e interruptores; instalar placas",
    "Ligar luminárias e aparelhos (TUE)",
    "Testar polaridade e terra das tomadas",
    ...(temDR ? ["Testar o DR do circuito (botão T)"] : []),
    "Limpar e conferir acabamento",
  ].map((texto, i) => ({ id: `${chave}:${i}`, texto }));
}

function somarMateriais(lista: MaterialPonto[][]) {
  const mapa = new Map<string, MaterialPonto>();
  for (const m of lista.flat()) {
    const atual = mapa.get(m.descricao);
    if (atual) atual.quantidade += m.quantidade;
    else mapa.set(m.descricao, { ...m });
  }
  return [...mapa.values()];
}

/** Monta a lista de pontos do quadro (projeto da obra ou circuitos montados à mão). */
export function listaDePontos(dados: QuadroDados, analise: AnaliseQuadro): ListaPontos {
  const ajustes = dados.pontos?.ajustes ?? {};
  const ambientes: AmbientePontos[] = [];
  const p = dados.projeto;

  if (p && p.ambientes.length) {
    const prev = preverAmbientes(p.ambientes);
    for (const x of prev) {
      const a = x.ambiente;
      const chave = a.id;
      const aj = ajustes[chave];
      const tipo = a.tipo;
      const pontos: Ponto[] = [];
      const cLuz = infoCircuito(analise, acharCircuito(analise, a.id, a.nome, (c) => c.tipo === "iluminacao"));
      const cTug = infoCircuito(analise, acharCircuito(analise, a.id, a.nome, (c) => c.tipo === "tug"));

      if (x.luzVA > 0) {
        const n = aj?.pontosLuz ?? pontosLuzPadrao(a.areaM2);
        if (n > 0) {
          pontos.push({
            chave: `${chave}:luz`,
            tipo: "luz",
            descricao: "Ponto de iluminação no teto",
            quantidade: n,
            potencia: Math.round(x.luzVA / n),
            tensaoV: null,
            altura: ALTURAS.teto,
            circuito: cLuz,
            kit: "ponto-iluminacao",
            nota: `Total ${x.luzVA} VA (mínimo NBR 5410 9.5.2.1: ${x.luzMinimaVA} VA)`,
          });
        }
      }
      const interruptor: TipoInterruptor = aj?.interruptor ?? interruptorPadrao(tipo, a.areaM2);
      if (x.luzVA > 0) {
        const n = aj?.interruptores ?? (interruptor === "simples" ? 1 : interruptor === "paralelo" ? 2 : 3);
        if (n > 0) {
          pontos.push({
            chave: `${chave}:int`,
            tipo: "interruptor",
            descricao: ROTULO_INTERRUPTOR[interruptor],
            quantidade: n,
            potencia: null,
            tensaoV: null,
            altura: ALTURAS.interruptor,
            circuito: cLuz,
            kit: interruptor === "simples" ? "interruptor-simples" : interruptor === "paralelo" ? "interruptor-paralelo" : null,
            nota: interruptor === "intermediario" ? "Com 2 paralelos nas pontas" : undefined,
          });
        }
      }
      // TUG: agrupa por potência (600 VA / 100 VA) e altura
      const grupos = new Map<string, { va: number; altura: string; qtd: number }>();
      x.vaPorTomada.forEach((va, i) => {
        const altura =
          tipo === "banheiro"
            ? `${ALTURAS.media} junto ao lavatório`
            : AMBIENTES_BANCADA.has(tipo) && i < 2
              ? `${ALTURAS.media} (sobre a bancada)`
              : AMBIENTES_MEDIA.has(tipo)
                ? ALTURAS.media
                : ALTURAS.baixa;
        const k = `${va}|${altura}`;
        const g = grupos.get(k) ?? { va, altura, qtd: 0 };
        g.qtd++;
        grupos.set(k, g);
      });
      [...grupos.values()].forEach((g, i) =>
        pontos.push({
          chave: `${chave}:tug${i}`,
          tipo: "tug",
          descricao: "Tomada de uso geral 2P+T 10 A",
          quantidade: g.qtd,
          potencia: g.va,
          tensaoV: dados.alimentacao.tensaoFN,
          altura: g.altura,
          circuito: cTug,
          kit: "tomada-10a-embutida",
        }),
      );
      // TUE do ambiente
      p.cargas
        .filter((c) => c.ambienteId === a.id)
        .forEach((c, i) => {
          const r = acharCircuito(analise, a.id, a.nome, (k) => k.tipo === "tue" && k.nome.startsWith(c.nome));
          const ib = r?.dim.ib ?? c.potenciaW / c.tensaoV;
          const alt = alturaTUE(`${c.tipo} ${c.nome}`);
          pontos.push({
            chave: `${chave}:tue${i}`,
            tipo: "tue",
            descricao: c.nome,
            quantidade: c.quantidade,
            potencia: c.potenciaW,
            tensaoV: c.tensaoV,
            altura: alt.altura,
            circuito: infoCircuito(analise, r),
            kit: kitTUE(`${presetCarga(c.tipo).nome} ${c.nome}`, ib),
            nota: alt.nota,
          });
        });

      ambientes.push({
        chave,
        nome: a.nome,
        tipoNome: TIPOS_AMBIENTE[tipo].nome,
        areaM2: a.areaM2 || null,
        perimetroM: perimetroEfetivo(a) || null,
        interruptor,
        pontos,
        materiais: materiaisDoAmbiente(pontos, interruptor, a.distanciaM),
        checklist: checklistDoAmbiente(chave, pontos),
        avisos: tipo === "banheiro" ? [AVISO_BANHEIRO] : [],
      });
    }
    // Cargas sem ambiente
    const soltas = p.cargas.filter((c) => !c.ambienteId || !p.ambientes.some((a) => a.id === c.ambienteId));
    if (soltas.length) {
      const pontos: Ponto[] = soltas.map((c, i) => {
        const r = analise.circuitos.find((k) => k.circuito.tipo === "tue" && k.circuito.nome.startsWith(c.nome));
        const alt = alturaTUE(`${c.tipo} ${c.nome}`);
        return {
          chave: `sem-ambiente:tue${i}`,
          tipo: "tue",
          descricao: c.nome,
          quantidade: c.quantidade,
          potencia: c.potenciaW,
          tensaoV: c.tensaoV,
          altura: alt.altura,
          circuito: infoCircuito(analise, r),
          kit: kitTUE(`${presetCarga(c.tipo).nome} ${c.nome}`, r?.dim.ib ?? c.potenciaW / c.tensaoV),
          nota: alt.nota,
        };
      });
      ambientes.push({
        chave: "sem-ambiente",
        nome: "Sem ambiente definido",
        tipoNome: "—",
        areaM2: null,
        perimetroM: null,
        interruptor: "simples",
        pontos,
        materiais: materiaisDoAmbiente(pontos, "simples", null),
        checklist: checklistDoAmbiente("sem-ambiente", pontos),
        avisos: [],
      });
    }
  } else {
    // Quadro montado do zero: agrupa os circuitos pelo local de cada um.
    const porLocal = new Map<string, ResultadoCircuito[]>();
    for (const r of analise.circuitos) porLocal.set(r.circuito.local, [...(porLocal.get(r.circuito.local) ?? []), r]);
    for (const [local, lista] of porLocal) {
      const chave = `local:${local}`;
      const aj = ajustes[chave];
      const pontos: Ponto[] = [];
      lista.forEach((r, i) => {
        const c = r.circuito;
        const info = infoCircuito(analise, r);
        if (c.tipo === "iluminacao") {
          const n = aj?.pontosLuz ?? c.quantidadePontos;
          pontos.push({
            chave: `${chave}:luz${i}`,
            tipo: "luz",
            descricao: "Ponto de iluminação",
            quantidade: n,
            potencia: n ? Math.round(c.potenciaW / n) : null,
            tensaoV: null,
            altura: ALTURAS.teto,
            circuito: info,
            kit: "ponto-iluminacao",
          });
        } else if (c.tipo === "tug") {
          pontos.push({
            chave: `${chave}:tug${i}`,
            tipo: "tug",
            descricao: "Tomada de uso geral 2P+T 10 A",
            quantidade: c.quantidadePontos,
            potencia: Math.round(c.potenciaW / c.quantidadePontos),
            tensaoV: r.tensaoV,
            altura: LOCAIS[c.local as keyof typeof LOCAIS]?.molhado ? ALTURAS.media : ALTURAS.baixa,
            circuito: info,
            kit: "tomada-10a-embutida",
          });
        } else {
          const alt = alturaTUE(c.nome);
          pontos.push({
            chave: `${chave}:tue${i}`,
            tipo: "tue",
            descricao: c.nome,
            quantidade: 1,
            potencia: c.potenciaW,
            tensaoV: r.tensaoV,
            altura: alt.altura,
            circuito: info,
            kit: kitTUE(c.nome, r.dim.ib),
            nota: alt.nota,
          });
        }
      });
      const interruptor: TipoInterruptor = aj?.interruptor ?? "simples";
      const luz = pontos.filter((x) => x.tipo === "luz").reduce((s, x) => s + x.quantidade, 0);
      if (luz > 0) {
        const n = aj?.interruptores ?? Math.max(1, Math.ceil(luz / 2)) * (interruptor === "paralelo" ? 2 : 1);
        if (n > 0) {
          pontos.push({
            chave: `${chave}:int`,
            tipo: "interruptor",
            descricao: ROTULO_INTERRUPTOR[interruptor],
            quantidade: n,
            potencia: null,
            tensaoV: null,
            altura: ALTURAS.interruptor,
            circuito: pontos.find((x) => x.tipo === "luz")?.circuito ?? null,
            kit: interruptor === "simples" ? "interruptor-simples" : interruptor === "paralelo" ? "interruptor-paralelo" : null,
          });
        }
      }
      ambientes.push({
        chave,
        nome: LOCAIS[local as keyof typeof LOCAIS]?.nome ?? local,
        tipoNome: "Local dos circuitos",
        areaM2: null,
        perimetroM: null,
        interruptor,
        pontos,
        materiais: materiaisDoAmbiente(pontos, interruptor, null),
        checklist: checklistDoAmbiente(chave, pontos),
        avisos: local === "banheiro" ? [AVISO_BANHEIRO] : [],
      });
    }
  }

  const todos = ambientes.flatMap((a) => a.pontos);
  const soma = (t: TipoPonto) => todos.filter((x) => x.tipo === t).reduce((s, x) => s + x.quantidade, 0);
  return {
    origem: p && p.ambientes.length ? "projeto" : "circuitos",
    ambientes,
    totais: { pontosLuz: soma("luz"), interruptores: soma("interruptor"), tug: soma("tug"), tue: soma("tue") },
    materiais: somarMateriais(ambientes.map((a) => a.materiais)),
  };
}

/** Quantidade de cada kit do catálogo para o orçamento (interruptor paralelo: o kit cobre os dois pontos). */
export function kitsDaLista(lista: ListaPontos) {
  const mapa = new Map<string, number>();
  const avulsos: { descricao: string; quantidade: number }[] = [];
  for (const p of lista.ambientes.flatMap((a) => a.pontos)) {
    if (!p.kit) {
      avulsos.push({ descricao: `${p.descricao} — instalação`, quantidade: p.quantidade });
      continue;
    }
    const qtd = p.kit === "interruptor-paralelo" ? Math.ceil(p.quantidade / 2) : p.quantidade;
    mapa.set(p.kit, (mapa.get(p.kit) ?? 0) + qtd);
  }
  return { kits: [...mapa.entries()].map(([chave, quantidade]) => ({ chave, quantidade })), avulsos };
}
