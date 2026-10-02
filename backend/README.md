# Backend - Plataforma B2B de Intermediação e Logística Alimentar

Node.js + Express + TypeScript, arquitetura em camadas (Routes → Controllers → Services → Repositories).

## Estrutura

```
src/
  config/         # env.ts (validação com Zod) e database.ts (pool MySQL)
  common/
    errors/       # AppError
    middlewares/  # auth (JWT), rbac, validate (Zod), error handler global, 404
    utils/        # apiResponse, asyncHandler, jwt, password, hashToken
  modules/
    auth/         # registo de cliente, login, refresh, logout, /me
    users/        # ADMIN cria Fornecedores/Transportadoras/Operadores
    products/     # catálogo (disponibilidade lógica, sem contagem de stock)
    orders/            # scaffold - próxima etapa
    purchase-orders/   # scaffold - próxima etapa
    payments/          # scaffold - próxima etapa
    shipments/         # scaffold - próxima etapa
  routes/         # agrega todos os módulos sob /api
  app.ts          # configuração do Express
  server.ts       # ponto de entrada
```

# Backend - Plataforma B2B de Intermediação e Logística Alimentar

Node.js + Express + TypeScript, arquitetura em camadas (Routes → Controllers → Services → Repositories).

## Estrutura

```
src/
  config/         # env.ts (validação com Zod) e database.ts (pool MySQL, transações, UTC)
  common/
    errors/       # AppError
    middlewares/  # auth (JWT), rbac, validate (Zod, estrito), rate limit, upload+antivírus-lite,
                  # idempotência, error handler global, 404
    utils/        # apiResponse (camelCase), asyncHandler, jwt, password, hashToken, db, money,
                  # documentNumber, pagination, files
    jobs/         # limpeza periódica (idempotency_keys e refresh_tokens expirados)
  modules/
    auth/               # registo de cliente, login, refresh, logout, /me
    users/              # ADMIN cria Fornecedores/Transportadoras/Operadores
    addresses/          # moradas de qualquer utilizador (entrega/recolha)
    categories/         # categorias do catálogo
    products/           # catálogo (disponibilidade lógica, preço de venda)
    supplier-products/  # tabela de preços de custo por fornecedor
    orders/             # CLIENTE cria encomendas; ADMIN aprova (gera PO + guias)
    payments/           # CLIENTE submete comprovativo; ADMIN valida/rejeita manualmente
    purchase-orders/    # visão cega do FORNECEDOR; ADMIN/OPERATOR podem cancelar ou reatribuir
    shipments/          # visão cega da TRANSPORTADORA, estados, POD (prova de entrega)
    notifications/      # notificações internas por utilizador
    files/              # acesso autenticado a comprovativos/POD (nunca públicos)
    dashboard/          # vendas, custos, margens, desempenho de fornecedores/transportadoras
  routes/         # agrega todos os módulos sob /api
  scripts/        # createAdmin.ts - cria a conta ADMIN inicial (substitui o hash no seed.sql)
  app.ts          # configuração do Express (helmet, cors, hpp, rate limit)
  server.ts       # ponto de entrada (timeouts, jobs de manutenção)
```

## Como arrancar

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Copiar `.env.example` para `.env` e preencher os dados do MySQL:
   ```bash
   cp .env.example .env
   ```

3. Correr `schema.sql` no MySQL Workbench (já inclui a tabela `idempotency_keys`). Quem já tinha
   corrido uma versão anterior só precisa de `database/migrations/002_idempotency_keys.sql`.

4. Criar a conta ADMIN inicial (substitui o hash bcrypt manual do seed.sql):
   ```bash
   npm run create-admin
   ```

5. Arrancar em modo desenvolvimento:
   ```bash
   npm run dev
   ```

6. Testar: `GET http://localhost:3000/health`

## Testar o fluxo completo (smoke test)

Duas formas equivalentes de testar o fluxo inteiro de ponta a ponta (registo → encomenda →
pagamento → aprovação → logística → entrega → dashboard), sem precisar de testar manualmente:

- **Terminal, sem instalar nada além de `jq`** (`sudo apt install jq`):
  ```bash
  chmod +x scripts/smoke-test.sh
  ./scripts/smoke-test.sh
  ```
  Pede o email/senha do ADMIN, gera todos os dados de teste sozinho (incluindo a imagem da prova
  de entrega) e para imediatamente no primeiro erro, mostrando a resposta exata da API.

- **Postman/Insomnia**: importar `postman/smoke-test.postman_collection.json` — ver
  `postman/README.md`. Só este caminho tem um passo manual (anexar uma imagem no pedido de POD).

## Fluxo de ponta a ponta já implementado

1. **CLIENT** regista-se (`POST /api/auth/register`) e faz login.
2. **CLIENT** cria uma encomenda (`POST /api/orders`, com `X-Idempotency-Key`) — preços e total
   são sempre calculados no servidor a partir do catálogo, nunca confiados ao cliente.
3. **CLIENT** submete o comprovativo de pagamento (`POST /api/payments`, multipart com `proof`).
4. **ADMIN** valida o pagamento (`POST /api/payments/:id/validate`).
5. **ADMIN** aprova a encomenda (`POST /api/orders/:id/approve`), atribuindo um fornecedor a cada
   item e uma transportadora — isto gera, numa única transação, as Ordens de Compra (uma por
   fornecedor) e as Guias de Transporte correspondentes.
6. **SUPPLIER** só vê as suas ordens de compra, sem qualquer dado do cliente (`GET /api/purchase-orders`),
   e avança o estado até `READY_FOR_PICKUP`.
7. **CARRIER** só vê as suas guias com os pontos A/B, sem nomes do fornecedor/cliente
   (`GET /api/shipments`), recolhe, transporta e conclui a entrega com prova fotográfica/assinatura
   (`POST /api/shipments/:id/deliver`, multipart).
8. Quando todas as guias de uma encomenda são entregues, a encomenda fecha automaticamente como
   `DELIVERED`, e todas as partes relevantes são notificadas (`GET /api/notifications`).

## Gestão de ordens de compra pelo Admin

- `POST /api/purchase-orders/:id/cancel` — cancela uma ordem ainda não recolhida (ex: fornecedor
  sem stock). Cancela também a guia de transporte associada, se ainda não tiver sido recolhida.
- `POST /api/purchase-orders/:id/reassign` — reatribui a mercadoria a outro fornecedor: cancela a
  ordem atual e cria uma nova (com o preço de custo do novo fornecedor), mantendo ou trocando a
  transportadora. Tudo numa única transação — ou fica tudo consistente, ou nada muda.

## Dashboard (Módulo 5)

- `GET /api/dashboard?from=AAAA-MM-DD&to=AAAA-MM-DD` (ADMIN/OPERATOR, por omissão últimos 30 dias):
  encomendas por estado, receita e custo de encomendas entregues, margem bruta e percentual, filas
  pendentes (pagamentos por validar, encomendas por aprovar, guias por recolher), top 5 produtos,
  e desempenho por transportadora e por fornecedor.

## Notificações por email

Toda notificação interna (`notifications`) passa também a gerar um email, automaticamente — sem
qualquer alteração nos services que já existiam (`notificationsRepository.create`/`notifyStaff`
tratam disto por baixo dos panos). Isto cobre: boas-vindas no registo, pagamento validado/rejeitado,
encomenda aprovada/em trânsito/entregue/cancelada, nova ordem de compra e cancelamento para o
fornecedor, nova guia para a transportadora, e os alertas para a equipa interna (nova encomenda,
pagamento por validar, etc.).

**Como funciona (padrão outbox transacional):**
1. Sempre que uma notificação é criada, uma linha é inserida na tabela `email_outbox` **na mesma
   transação** da operação de negócio. Se a operação falhar e for revertida, o email nunca chega a
   ser enfileirado — não há risco de "email enviado mas a ação não aconteceu".
2. Um *worker* em segundo plano (`common/jobs/emailWorker.ts`) lê a fila a cada 15 segundos, envia
   os emails pendentes via SMTP (nodemailer) e marca cada um como `SENT` ou `FAILED` (até 5
   tentativas). O envio nunca bloqueia nem atrasa a resposta da API.
3. **Sem SMTP configurado**, nada quebra: os emails ficam em `PENDING` na fila e o servidor arranca
   normalmente — útil em desenvolvimento. Basta preencher `SMTP_HOST` no `.env` mais tarde.

Configuração no `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`,
`MAIL_FROM_NAME`, `MAIL_FROM_EMAIL` (ver `.env.example`). Funciona com qualquer provedor SMTP
(Gmail com "palavra-passe de aplicação", SendGrid, Mailgun, Amazon SES, etc.).

## Proteções incluídas

- **Idempotência** (`X-Idempotency-Key`) em criar encomenda, submeter pagamento e aprovar — protege
  contra duplo clique e retries de rede.
- **Transações MySQL com `FOR UPDATE`** em todas as operações críticas (aprovar encomenda, validar
  pagamento, mudar estado de guia) — evita condições de corrida e dupla aprovação.
- **Uploads verificados por assinatura binária** (magic numbers), não só pela extensão/mimetype
  declarado pelo cliente; ficheiros nunca ficam acessíveis publicamente (servidos via
  `GET /api/files/...` com autenticação e verificação de posse).
- **Rate limiting** dedicado em login, registo e operações sensíveis (criar encomenda, submeter
  pagamento).
- **Intermediação cega** aplicada no nível dos dados: o fornecedor nunca recebe `order_id`/dados do
  cliente; a transportadora nunca recebe nomes do fornecedor/cliente, só moradas e a carga.
- Schemas Zod **estritos** (`.strict()`) em todos os módulos: qualquer campo extra no payload é
  rejeitado, em vez de ser ignorado silenciosamente.

## Próxima etapa sugerida

- Testes automatizados (unitários nos services, integração nas rotas críticas).
- WhatsApp (ex: via WhatsApp Business API/Twilio) como canal adicional — a fila `email_outbox` já
  estabelece o padrão (outbox transacional); um `whatsapp_outbox` seguiria a mesma lógica.
- Frontend Angular 18 consumindo esta API.

