# Colocando o domínio próprio no ar

A loja está em `https://acougue-online.luhcordeiroo.workers.dev` e vai passar a
responder também em **texasbifedelivery.com**.

## Situação atual

```
texasbifedelivery.com  →  ns1.globaldomaingroup.com
                          ns2.globaldomaingroup.com   (DNS no registrador)
                       →  104.18.26.246               (infra do Manus)
```

O DNS não está na conta Cloudflare. Um Worker só atende num domínio próprio
quando a Cloudflare é a autoridade de DNS dele — apontar um registro A não
resolve.

## Passo a passo

### 1. Adicionar o site na Cloudflare

Painel Cloudflare → **Adicionar site** → `texasbifedelivery.com` → plano
**Free**.

### 2. Conferir os registros importados

A Cloudflare varre o DNS atual e importa o que encontrar.

⚠️ **Confira os registros MX antes de seguir.** Se existe e-mail nesse domínio
(`contato@texasbifedelivery.com`, por exemplo), esses registros precisam
aparecer na lista. Trocar os nameservers sem eles derruba o e-mail, e é o tipo
de coisa que só se descobre quando um cliente reclama que a mensagem voltou.

Se algo estiver faltando, adicione manualmente antes do passo 3.

### 3. Trocar os nameservers no registrador

A Cloudflare atribuiu estes dois:

```
coco.ns.cloudflare.com
sevki.ns.cloudflare.com
```

No painel onde o domínio está registrado, **substitua** os atuais pelos de
cima:

| Remover | Adicionar |
| --- | --- |
| `ns1.globaldomaingroup.com` | `coco.ns.cloudflare.com` |
| `ns2.globaldomaingroup.com` | `sevki.ns.cloudflare.com` |

Os dois antigos precisam sair. Deixar um deles faz o DNS responder ora pela
Cloudflare, ora pelo registrador, e o site fica intermitente — o pior tipo de
falha, porque parece funcionar na metade dos testes.

**Não é preciso transferir o registro do domínio.** Só os nameservers. A
renovação continua onde está.

### 4. Aguardar a propagação

Normalmente minutos; pode levar até 24h. A Cloudflare avisa por e-mail e o
site aparece como **Ativo** no painel.

Para acompanhar:

```bash
nslookup -type=NS texasbifedelivery.com
```

Quando responder com `*.ns.cloudflare.com`, está pronto.

### 5. Publicar

Descomentar o bloco `routes` em [wrangler.jsonc](wrangler.jsonc):

```jsonc
"routes": [
  { "pattern": "texasbifedelivery.com", "custom_domain": true },
  { "pattern": "www.texasbifedelivery.com", "custom_domain": true }
],
```

E publicar:

```bash
pnpm deploy
```

A Cloudflare cria os registros DNS e emite o certificado HTTPS sozinha.

> O bloco fica comentado de propósito: publicar com uma rota cujo domínio ainda
> não está na conta faz o deploy inteiro falhar.

## Depois que estiver no ar

- `texasbifedelivery.com` serve a loja, com HTTPS
- `www.texasbifedelivery.com` redireciona para o domínio sem www, para não
  existirem dois endereços com sessões separadas
- O endereço `.workers.dev` continua funcionando, útil para testar sem afetar
  quem está usando a loja
- **O site antigo no Manus para de responder nesse domínio**

## Opcional: imagens no seu domínio

Hoje as fotos dos produtos saem de `pub-f40f62a9....r2.dev`. Com o domínio na
Cloudflare, dá para servi-las de `imagens.texasbifedelivery.com`:

1. R2 → bucket `acougue-online-imagens` → **Settings** → **Custom Domain**
2. Informar `imagens.texasbifedelivery.com`
3. Atualizar o secret: `wrangler secret put R2_PUBLIC_URL`

As imagens já cadastradas continuam apontando para o endereço antigo, que
segue funcionando — só as novas usariam o domínio próprio.
