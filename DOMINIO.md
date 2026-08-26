# Domínio próprio

A loja atende em **https://texasbifedelivery.com.br**.

| Endereço | O que faz |
| --- | --- |
| `texasbifedelivery.com.br` | a loja |
| `www.texasbifedelivery.com.br` | redireciona para o endereço acima |
| `acougue-online.luhcordeiroo.workers.dev` | mantido como reserva |

## Por que o `.workers.dev` continua ligado

Adicionar um domínio próprio desativa o `.workers.dev` por padrão. Ele foi
mantido de propósito: se o DNS do domínio falhar, a loja continua alcançável —
e o agente de impressão do balcão pode apontar para lá enquanto se resolve.

## Por que `run_worker_first`

Sem essa opção, um arquivo estático é entregue direto do cache da Cloudflare
**sem executar o Worker**, e o redirecionamento de `www` nunca rodaria. O custo
é uma invocação de Worker por requisição, irrelevante no volume de uma loja de
bairro.

## O domínio .com (antigo, na Manus)

O `texasbifedelivery.com` continua registrado pela Global Domain Group, com o
status `clientTransferProhibited` — travado. Se a Manus destravar, dá para
apontá-lo para cá também, adicionando as rotas em
[wrangler.jsonc](wrangler.jsonc). Não é necessário: o `.com.br` já atende.

## Imagens em domínio próprio (opcional)

As fotos dos produtos saem de `pub-f40f62a9....r2.dev`. Para servi-las de
`imagens.texasbifedelivery.com.br`:

1. R2 → bucket `acougue-online-imagens` → **Settings** → **Custom Domain**
2. Informar `imagens.texasbifedelivery.com.br`
3. Atualizar o secret: `wrangler secret put R2_PUBLIC_URL`

As imagens já cadastradas continuam apontando para o endereço antigo, que
segue funcionando — só as novas usariam o domínio próprio.
