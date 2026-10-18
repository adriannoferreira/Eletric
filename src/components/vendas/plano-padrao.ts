/** Tarefas sugeridas do plano de crescimento. `chave` é estável: não renomeie, só adicione novas. */
export const TAREFAS_PADRAO: { chave: string; fase: 30 | 60 | 90; titulo: string; descricao: string }[] = [
  // 30 dias — base profissional
  { chave: "gmn-criar", fase: 30, titulo: "Criar o Perfil da Empresa no Google (Google Meu Negócio)", descricao: "Categoria “Eletricista”, área de atendimento, horário, WhatsApp e no mínimo 10 fotos de serviços." },
  { chave: "whatsapp-business", fase: 30, titulo: "Configurar o WhatsApp Business", descricao: "Foto profissional, descrição, catálogo de serviços, mensagem de saudação e de ausência." },
  { chave: "instagram-pro", fase: 30, titulo: "Criar Instagram profissional", descricao: "Nome com a cidade (ex.: “Fulano Eletricista | Campinas”), bio com o que faz + link do WhatsApp, 6 primeiros posts." },
  { chave: "catalogo-precos", fase: 30, titulo: "Cadastrar seu catálogo de preços no app", descricao: "Serviços mais comuns com preço e a hora técnica calculada na aba Preços." },
  { chave: "cartao-qr", fase: 30, titulo: "Fazer cartão de visita / adesivo com QR Code do WhatsApp", descricao: "Deixe adesivo no quadro de cada cliente atendido: é o lugar que ele olha quando dá problema." },
  { chave: "avaliacoes-5", fase: 30, titulo: "Conseguir as 5 primeiras avaliações no Google", descricao: "Peça a todo cliente satisfeito (use a mensagem pronta em Conteúdo IA)." },
  { chave: "nr10", fase: 30, titulo: "NR-10 em dia e uniforme/EPI apresentáveis", descricao: "Segurança é argumento de venda contra o “curioso”. Mostre o certificado nas redes." },
  { chave: "antes-depois", fase: 30, titulo: "Fotografar antes e depois de todo serviço", descricao: "Quadro bagunçado → organizado vende sozinho. Crie o hábito desde já." },
  // 60 dias — gerar demanda
  { chave: "lojas-material", fase: 60, titulo: "Visitar 5 lojas de material elétrico do bairro", descricao: "Deixe cartões no balcão e combine indicações. Balconista indica quem atende bem." },
  { chave: "posts-semana", fase: 60, titulo: "Postar 3 vezes por semana (2 posts + 1 reels)", descricao: "Use os roteiros da aba Conteúdo IA. Constância vale mais que perfeição." },
  { chave: "gmn-posts", fase: 60, titulo: "Publicar 1 post por semana no Google Meu Negócio", descricao: "Perfis ativos aparecem mais nas buscas “eletricista perto de mim”." },
  { chave: "vizinhanca", fase: 60, titulo: "Ação de vizinhança após cada serviço", descricao: "Avise os vizinhos (panfleto/WhatsApp do condomínio) que está atendendo na rua naquela semana." },
  { chave: "followup-rotina", fase: 60, titulo: "Rotina de follow-up: todo orçamento sem resposta em 3 dias", descricao: "Use a aba Follow-up toda segunda e quinta." },
  { chave: "avaliacoes-20", fase: 60, titulo: "Chegar a 20 avaliações no Google", descricao: "Responda todas as avaliações, inclusive as negativas, com educação." },
  // 90 dias — escalar e recorrência
  { chave: "parceria-arquitetos", fase: 90, titulo: "Fechar parceria com 2 arquitetos ou designers de interiores", descricao: "Ofereça prioridade de agenda, acabamento caprichado e orçamento rápido." },
  { chave: "condominios", fase: 90, titulo: "Oferecer manutenção preventiva para 3 condomínios ou comércios", descricao: "Contrato mensal = renda recorrente. Use a aba Consultor para montar a proposta." },
  { chave: "pacotes", fase: 90, titulo: "Criar 3 pacotes de serviço com preço fechado", descricao: "Ex.: “Revisão elétrica completa”, “Troca de quadro com DR e DPS”, “Casa nova pronta”." },
  { chave: "metas", fase: 90, titulo: "Revisar seus números no Painel e definir meta do próximo trimestre", descricao: "Taxa de conversão, ticket médio e canal que mais traz clientes." },
  { chave: "indicacao-premiada", fase: 90, titulo: "Lançar programa de indicação", descricao: "Ex.: desconto ou brinde para o cliente que indicar alguém que fechar serviço." },
];
