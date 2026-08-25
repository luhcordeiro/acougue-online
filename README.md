# Açougue Online — Sistema de Pedidos

Sistema de pedidos para açougue: catálogo com preço por quilo, checkout sem
cadastro e painel administrativo para gerenciar produtos e pedidos.

Roda inteiramente na infraestrutura da Cloudflare — Workers, D1 e R2.

## Funcionalidades

### Loja (cliente)

- Catálogo de produtos com filtro por categoria e busca
- Detalhe do produto com escolha de quantidade e tipo de corte
- Quantidades rápidas configuráveis (500g, 1kg, 2kg…)
- Carrinho com cálculo automático por peso
- **Checkout sem cadastro**: nome, telefone e endereço no próprio pedido
- Pagamento em PIX, cartão ou dinheiro (com troco)
- Interface otimizada para celular

### Painel administrativo

- Dashboard com estatísticas
- CRUD de produtos, categorias, tipos de corte e quantidades rápidas
- Upload de imagens dos produtos (Cloudflare R2)
- Gestão de pedidos com filtro por categoria e status
- Aviso de novos pedidos (badge + toast, atualizado a cada 10s)
- Taxa de entrega configurável
- Gestão de usuários do painel

## Tecnologias

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite
- **API**: tRPC 11 no runtime do Cloudflare Workers
- **Banco**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Imagens**: Cloudflare R2
- **Autenticação**: usuário/senha próprio, com JWT em cookie httpOnly
- **Testes**: Vitest rodando dentro do workerd, com D1 real

## Começando

```bash
pnpm install
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

Aplicação em **http://localhost:8787** — painel em `/admin/login`
(`admin` / `admin123`, troque no primeiro acesso).

O passo a passo completo, incluindo deploy, está no
[GUIA_RAPIDO.md](GUIA_RAPIDO.md).

## Segurança

- Todas as rotas administrativas são validadas **no servidor** (`adminProcedure`),
  não no frontend
- Senhas com PBKDF2-SHA256 (Web Crypto)
- Cookie de sessão `httpOnly` + `SameSite=Lax`, expira em 12h
- Segredos ficam em `wrangler secret`, nunca no repositório

## Licença

MIT
