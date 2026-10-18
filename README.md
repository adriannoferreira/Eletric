# ⚡ Eletric — auxiliar e segundo cérebro do eletricista

App web instalável (PWA) feito para usar principalmente no **celular**, na obra, e também no **notebook**.

## Módulos

| Módulo | O que faz |
|---|---|
| **Início** | Resumo do mês, atalhos rápidos, primeiros passos e alertas (follow-up, calibração) |
| **Clientes** | Cadastro, busca, WhatsApp/ligar/mapa com um toque, histórico de orçamentos e quadros |
| **Orçamentos** | Monte com itens do catálogo, desconto e condições; envie pelo WhatsApp com link público; o cliente vê, salva em PDF e aprova |
| **Catálogo de preços** | Seus serviços e materiais com preço padrão (vem com uma lista inicial para ajustar) |
| **Quadros (QDC)** | Construtor visual do quadro de distribuição com peças reais, cálculo pela NBR 5410 e revisão por IA |
| **Calculadoras** | Corrente/potência, bitola de cabo, queda de tensão e disjuntor |
| **IA Especialista** | Chat com um engenheiro eletricista virtual (NBR 5410, NR-10, diagnóstico) com histórico salvo |
| **Vendas & Marketing** | Painel de vendas, follow-up pelo WhatsApp, precificação da hora técnica, gerador de conteúdo com IA, consultor de vendas e plano de crescimento 30/60/90 dias |
| **Equipamentos** | Ferramentas, instrumentos e EPIs com alerta de calibração/validade |
| **Meu perfil** | Seus dados que aparecem no orçamento (nome, WhatsApp, PIX, registro) |

## Tecnologia

Next.js 16 (React 19) · Tailwind CSS 4 · Neon Postgres + Drizzle ORM · Claude API (`@anthropic-ai/sdk`)

## Como rodar no notebook

Precisa do [Node.js 22+](https://nodejs.org) e do Git.

```bash
git clone https://github.com/adriannoferreira/eletric.git
cd eletric
git checkout claude/projeto-notebook-continuacao-evtigx
npm install
cp .env.example .env.local   # depois edite o .env.local (veja abaixo)
npm run dev
```

Abra http://localhost:3000 e entre com a senha que você definiu em `APP_PASSWORD`.

### O arquivo `.env.local`

Ele guarda as senhas e **não vai para o GitHub**. Preencha:

- `DATABASE_URL` — no [console do Neon](https://console.neon.tech), projeto **eletric** → botão **Connect** → copie a connection string.
- `APP_PASSWORD` — a senha para entrar no app (você escolhe).
- `AUTH_SECRET` — um texto aleatório longo (ex.: rode `openssl rand -base64 32`).
- `ANTHROPIC_API_KEY` — chave da API do Claude, criada em [console.anthropic.com](https://console.anthropic.com). Sem ela o app funciona, mas a IA fica desligada.

### Banco de dados

As tabelas já estão criadas no Neon. Se o esquema mudar (`src/db/schema.ts`):

```bash
npx drizzle-kit generate --name descricao-da-mudanca
npx drizzle-kit migrate
```

## Usar no celular

Para usar fora de casa, publique o app (ex.: na Vercel, importando este repositório e colocando as mesmas variáveis do `.env.local`). Depois abra o endereço no celular e escolha **"Adicionar à tela inicial"** — ele vira um app com ícone próprio.

## Comandos úteis

| Comando | Para quê |
|---|---|
| `npm run dev` | Rodar em modo desenvolvimento |
| `npm run build` | Gerar a versão de produção |
| `npm run lint` | Verificar o código |
| `npm test` | Rodar os testes do motor de cálculo NBR 5410 |

> ⚠️ Os cálculos e as respostas da IA são apoio técnico. Confira sempre a edição vigente das normas e o datasheet dos fabricantes; serviços que exigem projeto ou ART/TRT precisam de responsável técnico.
