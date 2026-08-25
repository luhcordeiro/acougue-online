# Agente de Impressão

Programa que roda no PC do balcão e imprime os cupons dos pedidos na impressora
térmica, **sem depender de o navegador estar aberto**.

Testado com **Elgin i9** (USB, 80mm) no Windows.

## Como funciona

```
Cliente faz o pedido
      ↓
A loja grava o cupom numa fila
      ↓
O agente pergunta "tem cupom?" a cada 3 segundos
      ↓
Imprime e confirma
```

Se a impressora estiver sem papel, o PC desligado ou a internet cair, o cupom
**fica na fila** e sai quando tudo voltar. Nada se perde.

## Instalação

### 1. Instalar o Node.js

Baixe a versão LTS em https://nodejs.org e instale com as opções padrão.
Para conferir, abra o Prompt de Comando e digite `node -v`.

### 2. Compartilhar a impressora

O agente envia comandos diretos para a impressora (ESC/POS), e no Windows isso
passa pelo compartilhamento. Imprimir pelo caminho comum (Word, Bloco de Notas)
descartaria esses comandos e você perderia o corte de papel e a acentuação.

1. **Painel de Controle → Dispositivos e Impressoras**
2. Botão direito na **Elgin i9** → **Propriedades da impressora**
3. Aba **Compartilhamento** → marcar **Compartilhar esta impressora**
4. Nome do compartilhamento: **`ELGIN`** (sem espaços e sem acentos)

### 3. Configurar o agente

Copie a pasta `agent` para o PC do balcão, por exemplo em `C:\acougue-agente`.

Crie o arquivo `.env` dentro dela (use o `.env.example` como base):

```
LOJA_URL=https://acougue-online.luhcordeiroo.workers.dev
AGENT_TOKEN=<token fornecido>
PRINTER=ELGIN
INTERVALO_MS=3000
```

O `AGENT_TOKEN` é o mesmo valor do secret `PRINT_AGENT_TOKEN` no Cloudflare.

### 4. Testar a impressora

```
node agent\testar-impressora.mjs
```

Deve sair um cupom de teste com acentos corretos e o papel cortado. Se falhar
aqui, o problema é a impressora ou o compartilhamento — não a loja.

Para testar a ligação com a loja **antes** de acertar a impressora, use
`PRINTER=SIMULADO`: o agente grava o cupom num arquivo em vez de imprimir.

### 5. Rodar

```
node agent\print-agent.mjs
```

Deixe essa janela aberta. Para iniciar junto com o Windows, veja abaixo.

## Iniciar junto com o Windows

Crie um arquivo `iniciar-agente.bat` com:

```bat
@echo off
cd /d C:\acougue-agente
node agent\print-agent.mjs
```

Aperte `Win + R`, digite `shell:startup` e coloque um atalho do `.bat` na pasta
que abrir. O agente passa a subir sozinho quando o PC liga.

## Verificando se está funcionando

No painel: **Configurações → Novos Pedidos → Fila de impressão**. Ali aparece
quantos cupons estão aguardando e quantos falharam, com botão para tentar de
novo.

Se acumular cupom "aguardando", o agente está parado ou sem internet.

## Problemas comuns

**"copy: acesso negado"** — o compartilhamento não existe ou o nome está
diferente do `.env`. Confira o passo 2.

**Sai o cupom mas com símbolos estranhos no lugar dos acentos** — a impressora
está em outra página de código. O agente usa CP850, padrão da Elgin i9; se a
sua estiver diferente, ajuste `ESC t n` em `escpos.mjs`.

**O papel não corta** — nem todo modelo aceita corte parcial. Troque
`GS V 66 0` por `GS V 65 0` (corte total) em `escpos.mjs`.

**Nada é impresso e a fila cresce** — confira se a **impressão automática**
está ligada em Configurações e se o `AGENT_TOKEN` bate com o do Cloudflare.
