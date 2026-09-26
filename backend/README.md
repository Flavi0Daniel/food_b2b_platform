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

## Como arrancar

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Copiar `.env.example` para `.env` e preencher os dados do MySQL:
   ```bash
   cp .env.example .env
   ```

3. Garantir que já correu `schema.sql` (e opcionalmente `seed.sql`) no MySQL Workbench.

4. Arrancar em modo desenvolvimento:
   ```bash
   npm run dev
   ```

5. Testar: `GET http://localhost:3000/health`

## Fluxo de autenticação

- `POST /api/auth/register` — registo público, sempre cria um utilizador `CLIENT`.
- `POST /api/auth/login` — devolve `accessToken` (curta duração) e `refreshToken` (guardado com hash na tabela `refresh_tokens`).
- `POST /api/auth/refresh` — troca o refresh token por um novo par de tokens (rotação).
- `GET /api/auth/me` — perfil do utilizador autenticado (`Authorization: Bearer <accessToken>`).

Contas de `SUPPLIER`, `CARRIER` e `OPERATOR` **não têm registo público** — são criadas por um `ADMIN` via `POST /api/users`.

## Próxima etapa

Implementar a lógica de negócio de `orders`, `purchase-orders`, `payments` e `shipments` (atualmente devolvem 501/erro "ainda não implementado"), incluindo:
- Transação de criação de encomenda (`orders` + `order_items`).
- Aprovação manual do Admin que dispara `purchase_orders` e `shipments`.
- Upload de comprovativo de pagamento e de POD (fica bem como armazenamento em disco/S3, referenciado por URL nas colunas `proof_url` / `pod_photo_url`).
