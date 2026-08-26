# Guia Rápido — Açougue Online

Aplicação de pedidos rodando em **Cloudflare Workers** com banco **D1** (SQLite)
e imagens em **R2**. Não depende de nenhuma plataforma externa.

## Stack

| Camada    | Tecnologia                                            |
| --------- | ----------------------------------------------------- |
| Frontend  | React 19 + Vite + Tailwind + wouter (SPA)             |
| API       | tRPC 11 sobre o runtime de Workers (adaptador fetch)  |
| Banco     | Cloudflare D1 (SQLite) + Drizzle ORM                  |
| Imagens   | Cloudflare R2 (binding nativo)                        |
| Sessão    | JWT assinado (jose) em cookie httpOnly                |

## Rodando localmente

```bash
pnpm install
pnpm db:migrate:local   # cria o schema no D1 local
pnpm db:seed:local      # catálogo + usuário admin
pnpm dev                # build do cliente + wrangler dev
```

Acesse **http://localhost:8787**
Painel: **/admin/login**. O seed cria o usuário `admin` com a senha definida
em `ADMIN_PASSWORD` — defina essa variável antes de semear. Sem ela o seed usa
uma senha padrão, que serve para a máquina local e **nunca** para produção:
como este repositório é público, qualquer um a conhece. Em produção, crie o
seu usuário em *Usuários* e desative o `admin`.

O `wrangler dev` roda o **mesmo runtime da produção** com um D1 local em
`.wrangler/state`. Não existe servidor Node separado: o que funciona aqui
funciona no Cloudflare.

### Segredos locais

Ficam em `.dev.vars` (fora do Git):

```
JWT_SECRET=<valor aleatório>
R2_PUBLIC_URL=<domínio público do bucket>
```

Gerar um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Comandos

```bash
pnpm dev                 # desenvolvimento (wrangler dev)
pnpm test                # testes dentro do workerd, com D1 real
pnpm check               # typecheck (app + worker + testes)
pnpm build               # build do cliente
pnpm deploy              # build + wrangler deploy

pnpm db:generate         # gera migração a partir de drizzle/schema.ts
pnpm db:migrate:local    # aplica migrações no D1 local
pnpm db:migrate:remote   # aplica migrações no D1 de produção
pnpm db:seed:local       # popula o D1 local
pnpm db:seed:remote      # popula o D1 de produção
```

## Deploy

**Em produção:** https://acougue-online.luhcordeiroo.workers.dev

A conta já está configurada (D1 `acougue-online`, bucket
`acougue-online-imagens` com acesso público, secrets `JWT_SECRET` e
`R2_PUBLIC_URL`). Se precisar refazer do zero em outra conta:

```bash
npx wrangler login
npx wrangler d1 create acougue-online          # atualizar o id no wrangler.jsonc
npx wrangler r2 bucket create acougue-online-imagens
npx wrangler r2 bucket dev-url enable acougue-online-imagens
npx wrangler secret bulk .dev.vars              # JWT_SECRET e R2_PUBLIC_URL
```

A cada publicação:

```bash
pnpm db:migrate:remote   # só quando o schema mudar
pnpm deploy
```

## Autenticação do painel

O login usuário/senha emite um **cookie httpOnly assinado (JWT, 12h)**. Quem
autoriza é o servidor: todas as rotas administrativas usam `adminProcedure`,
que valida esse cookie. O `sessionStorage` do frontend é apenas cache de UI e
**não** dá acesso a nada.

Sem sessão válida, as rotas admin respondem `401`:

```bash
curl http://localhost:8787/api/trpc/products.list
# {"error":{"json":{"message":"You do not have required permission (10002)",...
```

Senhas usam **PBKDF2-SHA256 via Web Crypto** (`server/_core/password.ts`).
bcrypt não é viável aqui: em JavaScript puro gasta ~100ms de CPU por
verificação e estouraria o limite por requisição do Workers.

## Estrutura

```
worker/index.ts        entrypoint do Cloudflare (tRPC + assets + bindings)
server/routers.ts      todas as rotas da API
server/db.ts           acesso ao banco (driver injetado pelo entrypoint)
server/seed.ts         catálogo inicial, compartilhado com os testes
server/_core/          sessão do admin, senha, contexto tRPC, env
drizzle/schema.ts      schema do D1
drizzle/migrations/    migrações aplicadas pelo wrangler
drizzle/_mysql-legacy/ histórico do schema MySQL (não é usado)
client/src/            SPA React
```

## Observações

- **Migrações são aplicadas pelo `wrangler`**, não pelo drizzle-kit. O
  drizzle-kit só gera o SQL (`pnpm db:generate`).
- **Os testes rodam no workerd** com um D1 de verdade e o mesmo seed da
  produção — não há mock de banco.
- O seed é **idempotente**: rodar de novo não duplica nada.
