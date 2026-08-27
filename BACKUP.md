# Backup e restauração do banco

O banco guarda o catálogo, os pedidos e os dados dos clientes. Este documento
existe porque a loja já perdeu um banco uma vez: quando rodava na Manus, a
plataforma saiu do ar e levou os dados junto.

## O que está em pé hoje

Três camadas, com falhas diferentes em mente:

| Camada | Cobre | Não cobre |
|---|---|---|
| **Time Travel** (Cloudflare, automático) | erro no app, migração ruim, exclusão acidental — volta a qualquer instante dos últimos 30 dias | perder a conta Cloudflare |
| **Backup diário no R2** | o mesmo, com histórico de 90 dias e cópias mensais por 3 anos | perder a conta Cloudflare |
| **Cópia cifrada no GitHub** | perder a conta Cloudflare | perder as duas contas |

O backup diário roda às **04:00 do horário de Brasília** (07:00 UTC), com a
loja fechada — o export deixa o banco indisponível por alguns segundos e não
pode cair em horário de pedido.

## Restaurar

### Caso 1: alguém apagou algo hoje

Não precisa de backup. O Time Travel volta o banco a um instante exato:

```bash
# ver onde o banco está agora
npx wrangler d1 time-travel info acougue-online

# voltar para 3 horas atrás
npx wrangler d1 time-travel restore acougue-online --timestamp="2026-08-27T10:00:00Z"
```

Isto sobrescreve o banco de produção. Antes de rodar, exporte o estado atual
(`wrangler d1 export`), senão o que existe agora se perde para sempre.

### Caso 2: restaurar de um backup

**O arquivo do backup não restaura direto.** O `wrangler d1 export` grava as
tabelas em ordem alfabética, então `orderItems` aparece antes de `products`,
que ela referencia — a carga morre em `FOREIGN KEY constraint failed`. O
`PRAGMA defer_foreign_keys` que o próprio export escreve na primeira linha não
resolve, porque o wrangler quebra o arquivo em lotes e o PRAGMA não atravessa
o lote seguinte.

Por isso existe o `scripts/preparar-restauracao.mjs`, que separa esquema de
dados e ordena as tabelas pelas dependências:

```bash
# 1. pegar o backup do R2
npx wrangler r2 object get acougue-online-backups/diario/2026-08-27.sql \
  --file backup.sql --remote

# 2. preparar
node scripts/preparar-restauracao.mjs backup.sql ./restauracao

# 3. carregar, NESTA ordem
npx wrangler d1 execute <banco> --remote --file ./restauracao/restaurar-1-esquema.sql
npx wrangler d1 execute <banco> --remote --file ./restauracao/restaurar-2-dados.sql
```

**Restaure primeiro num banco novo** (`wrangler d1 create acougue-conferencia`),
confira que os números batem, e só então decida o que fazer com a produção.
Restaurar por cima do banco vivo sem conferir antes é como o desastre piora.

Conferência que vale fazer:

```bash
npx wrangler d1 execute <banco> --remote --command \
  "SELECT (SELECT COUNT(*) FROM products) produtos,
          (SELECT COUNT(*) FROM orders) pedidos,
          (SELECT COALESCE(SUM(totalAmount),0) FROM orders) soma"
```

### Caso 3: a conta Cloudflare se perdeu

A cópia cifrada está no GitHub, em **Actions → Backup do banco → artefato**.
Baixe e decifre com a senha guardada em `BACKUP_PASSPHRASE`:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in banco-2026-08-27.sql.enc -out backup.sql
```

Daí em diante é o Caso 2, num banco novo em qualquer conta.

## Configuração necessária

O backup só roda com estes segredos em **Settings → Secrets and variables →
Actions**:

| Segredo | O que é |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token com permissão de ler D1 e escrever R2 |
| `CLOUDFLARE_ACCOUNT_ID` | `32de3226e5d67c55221555d56040f3f9` |
| `BACKUP_PASSPHRASE` | senha que cifra a cópia do GitHub |

**A `BACKUP_PASSPHRASE` precisa estar guardada fora do GitHub e fora da
Cloudflare** — num gerenciador de senhas, num papel no cofre, onde for. Se ela
se perder junto com a conta Cloudflare, a cópia de emergência vira lixo, que é
exatamente o cenário para o qual ela existe.

## O que NÃO está no backup

O banco é só parte do que a loja precisa para voltar a funcionar:

- **Imagens dos produtos e a foto da fachada** ficam no R2
  (`acougue-online-imagens`), fora deste backup.
- **Os segredos** (`.dev.vars`, `.env`, `agent/.env`) não estão no Git, e com
  razão — mas isso significa que existem só nas máquinas onde foram criados. O
  `AGENT_TOKEN` do computador do balcão é um deles.

## Conferir se o backup está vivo

Um backup que falha em silêncio é pior que não ter backup, porque dá a
sensação de estar protegido. O workflow falha alto se o dump vier pequeno
demais, com poucas tabelas, com poucos produtos, ou se não for preparável para
restauração.

Ainda assim, vale olhar de vez em quando:

```bash
npx wrangler r2 object get acougue-online-backups/diario/$(date -u +%F).sql \
  --file /tmp/hoje.sql --remote && ls -la /tmp/hoje.sql
```

E uma vez por ano, restaurar de verdade num banco novo. A restauração descrita
aqui foi testada em 27/08/2026 e conferida contra a produção: 317 produtos,
21 pedidos, mesma soma de totais.
