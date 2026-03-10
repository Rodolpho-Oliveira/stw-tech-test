# Dashboard de Monitoramento Industrial

Dashboard em tempo real para monitoramento do **Misturador M-01**, desenvolvido como solução para o desafio técnico de automação industrial.

---

## Visão Geral

A aplicação exibe o estado atual da máquina, métricas operacionais (temperatura, RPM, tempo de operação), histórico de métricas em gráfico interativo, sistema de alertas com priorização por severidade e métricas de eficiência OEE.

Os dados são simulados por um servidor Express que escreve em SQLite a cada 3 segundos. O frontend consome as mudanças via **Server-Sent Events (SSE)**, sem necessidade de polling.

---

## Estrutura do Projeto (Monorepo – Turborepo)

```
stw-test/
├── apps/
│   ├── api/          # Express + better-sqlite3 – porta 3001
│   │   └── src/
│   │       ├── db/         # Schema SQLite + seed inicial
│   │       ├── routes/     # Endpoints REST + SSE
│   │       ├── services/   # machineService (CRUD) + simulator (background)
│   │       └── middleware/ # Logger de requests
│   └── web/          # Next.js 14 (App Router) – porta 3000
│       └── src/
│           ├── app/        # layout + page principal
│           ├── components/
│           │   ├── dashboard/  # Header, MetricCard, MachineStateCard, EfficiencyMetrics
│           │   ├── charts/     # MetricsChart (Recharts)
│           │   └── alerts/     # AlertsList
│           ├── hooks/      # useMachineData (SSE + REST)
│           └── lib/        # api.ts (cliente HTTP/SSE), utils.ts
└── packages/
    └── types/        # Tipos TypeScript compartilhados (MachineStatus, Alert…)
```

---

## Pré-requisitos

- **Node.js** 18 ou superior
- **npm** 10 ou superior

> O projeto usa `npm workspaces` nativos + Turborepo. Não é necessário instalar o Turborepo globalmente.

---

## Instalação e Execução

### 1. Clonar e instalar dependências

```bash
git clone <url-do-repositorio>
cd stw-test
npm install
```

### 2. Variáveis de ambiente (opcional)

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edite conforme necessário (ports, URLs)
```

### 3. Iniciar em modo de desenvolvimento

```bash
# Inicia API (porta 3001) e Web (porta 3000) em paralelo
npm run dev
```

O banco SQLite é criado automaticamente em `apps/api/data/industrial.db` na primeira execução e populado com dados mock (histórico de ~1 hora + alertas pré-existentes).

Acesse: **http://localhost:3000**

### 4. Executar apenas a API ou o frontend

```bash
# Apenas backend
cd apps/api && npm run dev

# Apenas frontend
cd apps/web && npm run dev
```

---

## Seed Manual (opcional)

Se quiser reinicializar os dados:

```bash
cd apps/api
npx ts-node src/db/seed.ts
```

---

## Testes

```bash
# Todos os pacotes
npm run test

# Apenas frontend
cd apps/web && npm run test

# Apenas backend
cd apps/api && npm run test
```

---

## Build de Produção

```bash
npm run build

# Iniciar API
cd apps/api && npm start

# Iniciar Web
cd apps/web && npm start
```

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check |
| `GET` | `/api/machine/status` | Estado atual da máquina |
| `GET` | `/api/machine/history?limit=60` | Histórico de métricas |
| `GET` | `/api/machine/alerts?limit=20` | Lista de alertas |
| `POST` | `/api/machine/alerts/:id/ack` | Reconhecer alerta |
| `GET` | `/api/machine/dashboard` | Snapshot completo (status + alertas + histórico) |
| `GET` | `/api/machine/events` | **SSE** – stream em tempo real |

---

## Decisões Técnicas

### Monorepo com Turborepo
Turborepo oferece cache de builds e execução paralela de tasks. O pacote `@industrial/types` é referenciado diretamente via TypeScript path aliases (sem build intermediário), o que agiliza o desenvolvimento local.

### SSE em vez de WebSocket
Como o fluxo é unidirecional (servidor → cliente), SSE é mais simples: funciona sobre HTTP/1.1, não requer handshake e integra nativamente com `EventSource` no browser. Reconnect automático está implementado no hook `useMachineData`.

### better-sqlite3 (síncrono)
A API Express é single-threaded e as escritas ocorrem a cada 3 segundos — cenário ideal para SQLite síncrono. Elimina a complexidade de callbacks/promises sem sacrificar performance.

### Simulação com Ornstein-Uhlenbeck
Temperatura e RPM evoluem usando passos OU (mean-reverting random walk) em vez de ruído puro, produzindo séries temporais mais realistas para o histórico de gráfico.

### Dark mode com `class` strategy (Tailwind)
Permite toggle instantâneo sem flash (FOUC) graças ao `suppressHydrationWarning` no `<html>` e leitura de `localStorage` no `useEffect` do `ThemeProvider`.

### AudioContext para alertas críticos
Novos alertas `CRITICAL` disparam um beep via Web Audio API. A chamada está envoluta em `try/catch` porque navegadores podem bloquear o AudioContext sem interação prévia do usuário.

---

## Funcionalidades Implementadas

- [x] Estados da máquina: Ligada, Desligada, Manutenção, Erro
- [x] Métricas em tempo real: Temperatura, RPM, Tempo de Operação
- [x] Atualização via SSE (3 segundos)
- [x] Indicadores de tendência (▲▼) nos cards
- [x] Gráfico histórico interativo com filtro de séries
- [x] Linha de referência de temperatura crítica no gráfico
- [x] Sistema de alertas: INFO / WARNING / CRITICAL
- [x] Reconhecimento de alertas
- [x] Feedback sonoro para alertas CRITICAL
- [x] OEE com barra de progresso por sub-métrica
- [x] Gauge circular para OEE geral
- [x] Dark / Light mode com persistência em localStorage
- [x] Interface responsiva (mobile, tablet, desktop)
- [x] Indicador de status de conexão SSE
- [x] SQLite com dados pré-populados
- [x] Testes unitários (Jest + RTL)
