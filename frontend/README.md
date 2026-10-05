# Frontend - Plataforma B2B de Intermediação e Logística Alimentar

Angular 18, **NgModules clássicos** (sem `standalone`, sem Server-Side Rendering/Angular
Universal), Tailwind CSS v3.

## Estrutura

```
src/app/
  core/               # singletons: serviços, guards, interceptor, modelos — importado 1x no AppModule
    services/          auth.service, token-storage.service, dashboard.service
    guards/            auth.guard (sessão), role.guard (RBAC por rota)
    interceptors/       auth.interceptor (anexa JWT, renova em 401)
    models/            tipos partilhados (espelham as respostas da API)
  shared/             # componentes reutilizáveis, importado por cada módulo de funcionalidade
    components/shell/        layout com sidebar/header, usado pelos 4 painéis
    components/coming-soon/  placeholder para secções ainda por construir
  modules/            # um módulo por perfil, todos lazy-loaded
    auth/              login + registo (público)
    admin/             painel Admin/Operator — dashboard já ligado à API real
    client/            painel Cliente
    supplier/          painel Fornecedor
    carrier/           painel Transportadora
  app.module.ts / app-routing.module.ts / app.component.ts
```

## Como arrancar

1. Instalar dependências (precisa do Angular CLI global, ou usar `npx`):
   ```bash
   npm install
   ```

2. Confirmar que o **backend já está a correr** em `http://localhost:3000` (ver `environment.ts`
   para mudar o URL da API).

3. Arrancar em modo desenvolvimento:
   ```bash
   npm start
   ```
   Abre em `http://localhost:4200`.

## O que já funciona de ponta a ponta

- **Login** (`/auth/login`) e **Registo de Cliente** (`/auth/register`) — chamam a API real,
  guardam `accessToken`/`refreshToken`/utilizador, e redirecionam para o painel certo consoante
  o perfil (`ADMIN`/`OPERATOR` → `/admin`, `CLIENT` → `/client`, `SUPPLIER` → `/supplier`,
  `CARRIER` → `/carrier`).
- **Sessão persistente**: ao recarregar a página, a sessão mantém-se (guardada em `localStorage`).
- **Renovação automática de token**: se o `accessToken` expirar (resposta 401), o interceptor pede
  um novo automaticamente com o `refreshToken` e repete o pedido original — sem o utilizador notar.
  Se o `refreshToken` também já tiver expirado, a sessão termina e volta ao login.
- **Guards de rota**: `AuthGuard` (exige sessão) e `RoleGuard` (exige o perfil certo, declarado em
  `data: { roles: [...] }` de cada rota) protegem todos os painéis.
- **Dashboard do Admin** (`/admin/dashboard`) — já ligado a `GET /api/dashboard`, mostra receita,
  custo, margem, filas pendentes e produtos mais vendidos com dados reais.

## O que ainda é placeholder ("Em construção")

Todas as outras secções (Encomendas, Pagamentos, Produtos, Catálogo, Ordens de Compra, Guias de
Transporte, etc.) já estão na navegação de cada painel e têm rota própria, mas mostram por agora
um ecrã `ComingSoonComponent` — a estrutura de navegação (IA) está toda pronta, falta ligar cada
uma à sua parte da API (já construída e testada no backend).

## Decisões de arquitetura

- **Sem standalone components**: `angular.json` já tem `schematics.standalone: false` configurado,
  por isso `ng generate component ...` continua a gerar componentes clássicos (com NgModule), sem
  precisar de passar `--standalone=false` toda vez.
- **Sem SSR/Angular Universal**: o builder usado é o clássico `@angular-devkit/build-angular:browser`
  (não o novo `application` builder, que traz SSR/prerendering por padrão).
- **lucide-angular** já está configurado no `SharedModule` (ver `ICONS` em `shared.module.ts`), mas
  os ícones ainda não foram usados nos templates — confirma a sintaxe exata (`<lucide-icon name="...">`
  ou `[img]="IconRef"`) na documentação da versão instalada antes de usar, pode ter mudado entre
  versões.
- **GSAP** está no `package.json` mas ainda não foi usado — fica pronto para as páginas com mais
  animação (landing, onboarding).

## Próxima etapa sugerida

Construir cada secção "Em construção", pela ordem do fluxo de negócio: Catálogo (Cliente) → Criar
Encomenda → Pagamentos (Admin) → Aprovação (Admin) → Ordens de Compra (Fornecedor) → Guias de
Transporte (Transportadora). Cada uma consome um endpoint já testado e validado no backend
(`scripts/smoke-test.sh`), por isso o contrato da API já é conhecido e estável.
