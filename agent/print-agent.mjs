/**
 * Agente de impressão do balcão.
 *
 * Roda no PC do açougue, pergunta à loja se há cupom para imprimir e manda
 * direto para a impressora térmica. É o que permite o cupom sair sozinho sem
 * depender de o navegador estar aberto na aba certa.
 *
 * Uso:
 *   node print-agent.mjs
 *
 * Configuração por variáveis de ambiente (ou .env na mesma pasta):
 *   LOJA_URL      endereço da loja (ex: https://acougue-online...workers.dev)
 *   AGENT_TOKEN   mesmo valor do secret PRINT_AGENT_TOKEN no Cloudflare
 *   PRINTER       nome da impressora no Windows (ex: "ELGIN i9(USB)")
 *   INTERVALO_MS  intervalo entre verificações (padrão 3000)
 */

import { carregarEnv, primeiraLinha } from "./config.mjs";
import { buildEscPos } from "./escpos.mjs";
import { enviarParaImpressora } from "./imprimir.mjs";

carregarEnv();

const LOJA_URL = (process.env.LOJA_URL ?? "").replace(/\/+$/, "");
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? "";
const PRINTER = process.env.PRINTER ?? "";
const INTERVALO_MS = Number(process.env.INTERVALO_MS ?? 3000);

if (!LOJA_URL || !AGENT_TOKEN || !PRINTER) {
  console.error("Configuracao incompleta. Defina LOJA_URL, AGENT_TOKEN e PRINTER");
  console.error("no arquivo .env (veja .env.example), ou rode INSTALAR.bat.");
  process.exit(1);
}

const log = (...args) =>
  console.log(new Date().toLocaleTimeString("pt-BR"), ...args);

// -------------------------------------------------------------------- fila

async function buscarCupons() {
  const resposta = await fetch(`${LOJA_URL}/api/print/jobs`, {
    headers: { authorization: `Bearer ${AGENT_TOKEN}` },
  });

  if (resposta.status === 401) {
    throw new Error("token recusado pela loja - confira AGENT_TOKEN no .env");
  }

  if (resposta.status === 503) {
    throw new Error("a loja ainda nao tem o agente configurado (secret ausente)");
  }

  if (!resposta.ok) {
    throw new Error(`loja respondeu ${resposta.status}`);
  }

  const { jobs } = await resposta.json();
  return jobs ?? [];
}

async function confirmar(id, ok, erro) {
  await fetch(`${LOJA_URL}/api/print/ack`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${AGENT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ id, ok, error: erro }),
  });
}

let offline = false;

async function ciclo() {
  let cupons;

  try {
    cupons = await buscarCupons();

    if (offline) {
      log("conexao com a loja restabelecida");
      offline = false;
    }
  } catch (error) {
    // só avisa na transição, senão a tela vira um muro de erros repetidos
    if (!offline) {
      log("sem conexao com a loja:", primeiraLinha(error.message));
      offline = true;
    }
    return;
  }

  for (const cupom of cupons) {
    try {
      const detalhe = await enviarParaImpressora(buildEscPos(cupom.content), PRINTER);
      await confirmar(cupom.id, true);
      log(`cupom #${cupom.id} impresso (pedido #${cupom.orderId ?? "-"}) ${detalhe}`);
    } catch (error) {
      // devolve para a fila: a loja reenvia até o limite de tentativas
      const motivo = primeiraLinha(error.message);
      await confirmar(cupom.id, false, motivo).catch(() => {});
      log(`falha ao imprimir cupom #${cupom.id}: ${motivo}`);
    }
  }
}

// -------------------------------------------------------------------- main

log("agente de impressao iniciado");
log(`  loja.......: ${LOJA_URL}`);
log(`  impressora.: ${PRINTER}`);
log(`  verificando a cada ${INTERVALO_MS / 1000}s`);

// um ciclo por vez: sem isso, uma impressão lenta acumularia ciclos em cima
let rodando = false;

setInterval(async () => {
  if (rodando) return;
  rodando = true;
  try {
    await ciclo();
  } finally {
    rodando = false;
  }
}, INTERVALO_MS);

ciclo();
