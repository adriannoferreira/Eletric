/** Bloco fixo com as regras-chave da Equatorial Pará para o prompt da IA (texto estável, para cache). */
import { LIGACOES_PA, RESTRICOES, TABELA_2 } from "./fornecimento";

const tab2 = TABELA_2.map(
  (l) => `${l.tipo} ${l.cargaDeKW}–${l.cargaAteKW} kW: disjuntor ${l.disjuntorA} A, condutor cliente ${l.condutorCliente} mm², eletroduto aço ${l.eletrodutoAco}, aterramento aço cobreado ${l.aterramentoMm2} mm²`,
).join("; ");

export const BLOCO_PROMPT_EQUATORIAL = `

Regras da concessionária do usuário (Equatorial Pará, NT.00001 rev. 09 — Fornecimento de Energia Elétrica em Baixa Tensão):
- Rede 220/127 V. Monofásico 127 V até 10 kW de carga instalada (sem: ${RESTRICOES.monofasico.join("; ")}). Bifásico 220/127 V de 10 a 15 kW (sem: ${RESTRICOES.bifasico.join("; ")}). Trifásico 220/127 V até 75 kW (acima dos limites do item 6.2.1.3 exige estudo). Acima de 75 kW: média tensão (NT.00002). Equipamento trifásico obriga ligação trifásica.
- Padrão dimensionado pela carga instalada (TABELA 2): ${tab2}.
- Estudo de rede (item 5.5): trifásico com demanda ≥ 22 kVA; motor monofásico ≥ 2 cv, bifásico ≥ 3 cv, trifásico ≥ 15 cv; raios-X e solda a transformador; evento provisório acima de 6 kW.
- Ramal ≤ 30 m (6.3.2.4), alturas 3,5 m pedestres / 5,5 m veículos (6.3.2.6). Caixa de medição homologada a 1,30 m ± 0,10 m; disjuntor geral em caixa de proteção separada. Aterramento: neutro aterrado na caixa de medição, condutor de aço cobreado, 1 haste Ø 16 × 1.500 mm (6.3.4). Motor trifásico acima de 5 cv exige partida com redução de corrente (6.3.8.8, TABELA 7).
- ${LIGACOES_PA.monofasico.condutores} no monofásico; UC individual em BT não apresenta projeto à Equatorial (5.2), exceto GD (NT.00020) e recarga de VE acima de 7,4 kW (NT.00042).
Ao citar essas regras, mencione o item da NT.00001 e recomende conferir se há revisão mais nova no site da Equatorial Pará.`;
