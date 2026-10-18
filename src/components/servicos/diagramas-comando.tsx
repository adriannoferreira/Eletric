/**
 * Diagramas de comando em escada (ladder): trilho L à esquerda, N à direita,
 * elementos em série nos degraus. Desenhados com currentColor (tema claro/escuro).
 */

const T = { fontSize: 11, fill: "currentColor", fontFamily: "var(--font-geist-sans), sans-serif" } as const;

function Fio({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.6} />;
}

function No({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={2.6} fill="currentColor" />;
}

/** Contato de largura 24: NA (aberto) ou NF (fechado, com traço diagonal). */
function Contato({ x, y, nf, rotulo, sub, botao, boia }: { x: number; y: number; nf?: boolean; rotulo: string; sub?: string; botao?: boolean; boia?: boolean }) {
  return (
    <g>
      <line x1={x} y1={y - 10} x2={x} y2={y + 10} stroke="currentColor" strokeWidth={1.6} />
      <line x1={x + 24} y1={y - 10} x2={x + 24} y2={y + 10} stroke="currentColor" strokeWidth={1.6} />
      {nf && <line x1={x - 3} y1={y + 12} x2={x + 27} y2={y - 12} stroke="currentColor" strokeWidth={1.6} />}
      {botao && (
        <g>
          <line x1={x + 12} y1={y - 12} x2={x + 12} y2={y - 24} stroke="currentColor" strokeWidth={1.2} strokeDasharray="2 2" />
          <line x1={x + 4} y1={y - 24} x2={x + 20} y2={y - 24} stroke="currentColor" strokeWidth={1.6} />
        </g>
      )}
      {boia && <circle cx={x + 12} cy={y - 22} r={5} fill="none" stroke="currentColor" strokeWidth={1.4} />}
      <text x={x + 12} y={y + 26} textAnchor="middle" {...T} fontWeight={600}>{rotulo}</text>
      {sub && <text x={x + 12} y={y + 38} textAnchor="middle" {...T} fontSize={9} opacity={0.75}>{sub}</text>}
    </g>
  );
}

function Bobina({ x, y, rotulo, sub }: { x: number; y: number; rotulo: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y - 10} width={30} height={20} rx={2} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <text x={x + 15} y={y + 26} textAnchor="middle" {...T} fontWeight={600}>{rotulo}</text>
      {sub && <text x={x + 15} y={y + 38} textAnchor="middle" {...T} fontSize={9} opacity={0.75}>{sub}</text>}
    </g>
  );
}

function Lampada({ x, y, rotulo }: { x: number; y: number; rotulo: string }) {
  return (
    <g>
      <circle cx={x + 12} cy={y} r={11} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <line x1={x + 4} y1={y - 8} x2={x + 20} y2={y + 8} stroke="currentColor" strokeWidth={1.2} />
      <line x1={x + 20} y1={y - 8} x2={x + 4} y2={y + 8} stroke="currentColor" strokeWidth={1.2} />
      <text x={x + 12} y={y + 26} textAnchor="middle" {...T} fontWeight={600}>{rotulo}</text>
    </g>
  );
}

function Trilhos({ w, h }: { w: number; h: number }) {
  return (
    <g>
      <Fio x1={20} y1={18} x2={20} y2={h - 10} />
      <Fio x1={w - 20} y1={18} x2={w - 20} y2={h - 10} />
      <text x={20} y={12} textAnchor="middle" {...T} fontWeight={700}>L</text>
      <text x={w - 20} y={12} textAnchor="middle" {...T} fontWeight={700}>N</text>
    </g>
  );
}

function Svg({ w, h, titulo, children }: { w: number; h: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-surface-2 p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto min-w-[340px] max-w-full text-fg" role="img" aria-label={titulo}>
        {children}
      </svg>
    </div>
  );
}

/** Comando de partida direta: térmico, botoeira desliga/liga, selo e sinaleiro. */
export function DiagramaPartidaDireta() {
  const w = 400;
  return (
    <Svg w={w} h={200} titulo="Comando de partida direta">
      <Trilhos w={w} h={200} />
      {/* degrau 1 */}
      <Fio x1={20} y1={50} x2={40} y2={50} />
      <Contato x={40} y={50} nf rotulo="F1" sub="95-96" />
      <Fio x1={64} y1={50} x2={100} y2={50} />
      <Contato x={100} y={50} nf botao rotulo="S0" sub="desliga" />
      <Fio x1={124} y1={50} x2={170} y2={50} />
      <No x={150} y={50} />
      <Contato x={170} y={50} botao rotulo="S1" sub="liga" />
      <Fio x1={194} y1={50} x2={300} y2={50} />
      <No x={240} y={50} />
      <Bobina x={300} y={50} rotulo="K1" sub="A1-A2" />
      <Fio x1={330} y1={50} x2={w - 20} y2={50} />
      {/* selo */}
      <Fio x1={150} y1={50} x2={150} y2={110} />
      <Fio x1={150} y1={110} x2={170} y2={110} />
      <Contato x={170} y={110} rotulo="K1" sub="13-14 (selo)" />
      <Fio x1={194} y1={110} x2={240} y2={110} />
      <Fio x1={240} y1={110} x2={240} y2={50} />
      {/* sinaleiro */}
      <Fio x1={240} y1={110} x2={240} y2={170} />
      <Fio x1={240} y1={170} x2={300} y2={170} />
      <Lampada x={300} y={170} rotulo="H1 ligado" />
      <Fio x1={324} y1={170} x2={w - 20} y2={170} />
    </Svg>
  );
}

/** Bomba com chave Auto/Manual e boias inferior e superior. */
export function DiagramaBomba() {
  const w = 440;
  return (
    <Svg w={w} h={260} titulo="Comando de bomba com boias">
      <Trilhos w={w} h={260} />
      <Fio x1={20} y1={50} x2={40} y2={50} />
      <Contato x={40} y={50} nf rotulo="F1" sub="95-96" />
      <Fio x1={64} y1={50} x2={90} y2={50} />
      <Contato x={90} y={50} nf botao rotulo="S0" sub="desliga" />
      <Fio x1={114} y1={50} x2={150} y2={50} />
      <No x={135} y={50} />
      {/* ramo AUTO */}
      <Contato x={150} y={50} rotulo="SA" sub="auto" />
      <Fio x1={174} y1={50} x2={200} y2={50} />
      <Contato x={200} y={50} boia rotulo="B1" sub="boia inferior" />
      <Fio x1={224} y1={50} x2={260} y2={50} />
      <Contato x={260} y={50} boia rotulo="B2" sub="boia superior" />
      <Fio x1={284} y1={50} x2={340} y2={50} />
      <No x={315} y={50} />
      <Bobina x={340} y={50} rotulo="K1" />
      <Fio x1={370} y1={50} x2={w - 20} y2={50} />
      {/* ramo MANUAL */}
      <Fio x1={135} y1={50} x2={135} y2={135} />
      <Fio x1={135} y1={135} x2={150} y2={135} />
      <Contato x={150} y={135} rotulo="SA" sub="manual" />
      <Fio x1={174} y1={135} x2={200} y2={135} />
      <No x={190} y={135} />
      <Contato x={200} y={135} botao rotulo="S1" sub="liga" />
      <Fio x1={224} y1={135} x2={315} y2={135} />
      <No x={250} y={135} />
      <Fio x1={315} y1={135} x2={315} y2={50} />
      {/* selo do manual */}
      <Fio x1={190} y1={135} x2={190} y2={210} />
      <Fio x1={190} y1={210} x2={200} y2={210} />
      <Contato x={200} y={210} rotulo="K1" sub="13-14 selo" />
      <Fio x1={224} y1={210} x2={250} y2={210} />
      <Fio x1={250} y1={210} x2={250} y2={135} />
    </Svg>
  );
}

/** Iluminação/bomba comandada por temporizador (ou fotocélula) acionando contator. */
export function DiagramaTimer() {
  const w = 400;
  return (
    <Svg w={w} h={160} titulo="Comando por temporizador">
      <Trilhos w={w} h={160} />
      <Fio x1={20} y1={50} x2={150} y2={50} />
      <Bobina x={150} y={50} rotulo="T1" sub="timer / fotocélula" />
      <Fio x1={180} y1={50} x2={w - 20} y2={50} />
      <Fio x1={20} y1={115} x2={110} y2={115} />
      <Contato x={110} y={115} rotulo="T1" sub="contato NA" />
      <Fio x1={134} y1={115} x2={260} y2={115} />
      <Bobina x={260} y={115} rotulo="K1" sub="contator" />
      <Fio x1={290} y1={115} x2={w - 20} y2={115} />
    </Svg>
  );
}

/** Circuito de força da partida direta trifásica. */
export function DiagramaForca() {
  const xs = [80, 140, 200];
  return (
    <Svg w={300} h={300} titulo="Força da partida direta trifásica">
      {xs.map((x, i) => (
        <g key={x}>
          <text x={x} y={14} textAnchor="middle" {...T} fontWeight={700}>L{i + 1}</text>
          <Fio x1={x} y1={20} x2={x} y2={50} />
          {/* Q1 disjuntor-motor */}
          <rect x={x - 9} y={50} width={18} height={26} fill="none" stroke="currentColor" strokeWidth={1.6} />
          <Fio x1={x} y1={76} x2={x} y2={100} />
          {/* K1 contato principal */}
          <line x1={x} y1={100} x2={x + 10} y2={122} stroke="currentColor" strokeWidth={1.6} />
          <Fio x1={x} y1={124} x2={x} y2={150} />
          {/* F1 relé térmico */}
          <path d={`M ${x} 150 l 0 6 l 6 4 l -12 6 l 12 6 l -6 4 l 0 6`} fill="none" stroke="currentColor" strokeWidth={1.6} />
          <Fio x1={x} y1={182} x2={x} y2={222} />
        </g>
      ))}
      <text x={232} y={68} {...T} fontWeight={600}>Q1</text>
      <text x={232} y={116} {...T} fontWeight={600}>K1</text>
      <text x={232} y={170} {...T} fontWeight={600}>F1</text>
      <line x1={70} y1={222} x2={210} y2={222} stroke="currentColor" strokeWidth={1.6} />
      <circle cx={140} cy={252} r={26} fill="none" stroke="currentColor" strokeWidth={1.8} />
      <Fio x1={140} y1={222} x2={140} y2={226} />
      <text x={140} y={256} textAnchor="middle" {...T} fontSize={13} fontWeight={700}>M 3~</text>
    </Svg>
  );
}
