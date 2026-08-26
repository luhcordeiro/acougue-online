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

## Instalação rápida

1. Instale o **Node.js** (versão LTS) em https://nodejs.org
2. Dê **duplo clique em `INSTALAR.bat`**

O instalador lista as impressoras instaladas, pergunta qual usar e o token,
imprime um cupom de teste e configura o início automático com o Windows.

**Não é preciso compartilhar a impressora.** O agente fala com o spooler do
Windows diretamente, usando o nome da impressora como ela aparece em
Configurações (ex: `ELGIN i9(USB)`).

Depois disso, o agente sobe sozinho toda vez que o PC ligar. Para iniciar na
mão, use `INICIAR.bat`.

> `INICIAR.bat` reinicia o agente sozinho se ele travar. Um agente parado
> significa pedido que entrou e não imprimiu — e ninguém no balcão repara nisso
> até o cliente ligar cobrando.

---

## Instalação passo a passo (manual)

### 1. Instalar o Node.js

Baixe a versão LTS em https://nodejs.org e instale com as opções padrão.
Para conferir, abra o Prompt de Comando e digite `node -v`.

### 2. Descobrir o nome da impressora

Em **Configurações → Bluetooth e dispositivos → Impressoras e scanners**,
anote o nome exato — normalmente `ELGIN i9(USB)`.

O agente envia comandos ESC/POS pelo spooler do Windows, em modo RAW. Imprimir
pelo caminho comum (Word, Bloco de Notas) descartaria esses comandos e você
perderia o corte de papel e a acentuação.

### 3. Configurar o agente

Copie a pasta `agent` para o PC do balcão, por exemplo em `C:\acougue-agente`.

Crie o arquivo `.env` dentro dela (use o `.env.example` como base):

```
LOJA_URL=https://texasbifedelivery.com.br
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

## Quando algo não funciona

Rode o **`DIAGNOSTICO.bat`**. Ele testa cada elo separadamente — configuração,
conexão com a loja, token e impressora — e diz em qual deles está o problema,
em vez de deixar "não imprime" como única informação.

## Verificando se está funcionando

No painel: **Configurações → Novos Pedidos → Fila de impressão**. Ali aparece
quantos cupons estão aguardando e quantos falharam, com botão para tentar de
novo.

Se acumular cupom "aguardando", o agente está parado ou sem internet.

## Atualizando o agente

Quando a loja receber uma atualização que mexe no cupom, copie a pasta `agent`
inteira por cima da que está neste computador — menos o `.env`, que guarda o
token e o nome da impressora desta máquina.

Copie os arquivos, **não abra e cole o conteúdo dentro de um editor**: colar
pode trocar a codificação e transformar todos os acentos em "?" no cupom, sem
dar nenhum erro. Depois de copiar, feche a janela do agente, rode
`node testar-impressora.mjs` e confira no papel se os acentos saíram certos;
só então abra o `INICIAR.bat` de novo.

## Problemas comuns

**"Nao foi possivel abrir a impressora"** — o nome no `.env` está diferente do
nome real. Rode `node testar-impressora.mjs`: ao falhar, ele lista as
impressoras instaladas para você copiar o nome certo.

**Sai o cupom mas com símbolos estranhos no lugar dos acentos** — a impressora
está em outra página de código. O agente usa CP850, padrão da Elgin i9; se a
sua estiver diferente, ajuste `ESC t n` em `escpos.mjs`.

**Todo acento sai como "?"** — sinal de que o `escpos.mjs` deste computador foi
salvo em outra codificação por algum editor. Não tente consertar à mão: copie
o arquivo do repositório por cima e rode `node testar-impressora.mjs`.

**O papel não corta** — nem todo modelo aceita corte parcial. Troque
`GS V 66 0` por `GS V 65 0` (corte total) em `escpos.mjs`.

**Nada é impresso e a fila cresce** — confira se a **impressão automática**
está ligada em Configurações e se o `AGENT_TOKEN` bate com o do Cloudflare.
