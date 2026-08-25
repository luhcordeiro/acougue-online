/**
 * Agente de impressão do balcão.
 *
 * Roda no PC do açougue, pergunta à loja se há cupom para imprimir e manda
 * direto para a impressora térmica. É o que permite o cupom sair sozinho sem
 * depender de o navegador estar aberto na aba certa.
 *
 * Uso:
 *   node agent/print-agent.mjs
 *
 * Configuração por variáveis de ambiente (ou agent/.env):
 *   LOJA_URL      endereço da loja (ex: https://acougue-online...workers.dev)
 *   AGENT_TOKEN   mesmo valor do secret PRINT_AGENT_TOKEN no Cloudflare
 *   PRINTER       nome do compartilhamento da impressora (ex: ELGIN)
 *   INTERVALO_MS  intervalo entre verificações (padrão 3000)
 */

import { execFile } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { buildEscPos } from "./escpos.mjs";

const execFileAsync = promisify(execFile);

// ------------------------------------------------------------------ config

function carregarEnv() {
  try {
    const conteudo = readFileSync(new URL("./.env", import.meta.url), "utf-8");
    for (const linha of conteudo.split("\n")) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith("#")) continue;

      const igual = limpa.indexOf("=");
      if (igual < 0) continue;

      const chave = limpa.slice(0, igual).trim();
      if (!process.env[chave]) {
        process.env[chave] = limpa.slice(igual + 1).trim();
      }
    }
  } catch {
    // sem .env: usa só as variáveis do sistema
  }
}

carregarEnv();

const LOJA_URL = (process.env.LOJA_URL ?? "").replace(/\/+$/, "");
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? "";
const PRINTER = process.env.PRINTER ?? "";
const INTERVALO_MS = Number(process.env.INTERVALO_MS ?? 3000);

if (!LOJA_URL || !AGENT_TOKEN || !PRINTER) {
  console.error("Configuração incompleta. Defina LOJA_URL, AGENT_TOKEN e PRINTER");
  console.error("em agent/.env (veja agent/.env.example).");
  process.exit(1);
}

const log = (...args) =>
  console.log(new Date().toLocaleTimeString("pt-BR"), ...args);

// ---------------------------------------------------------------- impressão

/**
 * Envia os bytes crus para a impressora.
 *
 * Passa pelo compartilhamento do Windows (\\localhost\NOME) porque é o único
 * caminho que aceita ESC/POS sem driver nativo: imprimir pelo Word ou pelo
 * `print` do Windows renderiza o texto e descarta os comandos da impressora,
 * perdendo o corte de papel e a acentuação.
 */
async function imprimir(bytes) {
  // Modo de teste: grava o que sairia na impressora, sem imprimir. Serve para
  // validar a ligação com a loja antes de a impressora estar configurada.
  if (PRINTER.toUpperCase() === "SIMULADO") {
    const destino = join(tmpdir(), `cupom-simulado-${Date.now()}.bin`);
    writeFileSync(destino, bytes);
    log(`  [simulado] gravado em ${destino}`);
    return;
  }

  const arquivo = join(tmpdir(), `cupom-${Date.now()}.bin`);
  writeFileSync(arquivo, bytes);

  try {
    // /b = modo binário; sem isso o Windows interrompe no primeiro 0x1A
    await execFileAsync(
      "cmd",
      ["/c", "copy", "/b", arquivo, `\\\\localhost\\${PRINTER}`],
      { windowsHide: true }
    );
  } finally {
    try {
      unlinkSync(arquivo);
    } catch {
      // arquivo temporário: falhar ao apagar não é problema
    }
  }
}

// ------------------------------------------------------------------- fila

async function buscarCupons() {
  const resposta = await fetch(`${LOJA_URL}/api/print/jobs`, {
    headers: { authorization: `Bearer ${AGENT_TOKEN}` },
  });

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
      log("conexão com a loja restabelecida");
      offline = false;
    }
  } catch (error) {
    // só avisa na transição, senão a tela vira um muro de erros
    if (!offline) {
      log("sem conexão com a loja:", error.message);
      offline = true;
    }
    return;
  }

  for (const cupom of cupons) {
    try {
      await imprimir(buildEscPos(cupom.content));
      await confirmar(cupom.id, true);
      log(`cupom #${cupom.id} impresso (pedido #${cupom.orderId ?? "-"})`);
    } catch (error) {
      // devolve para a fila: a loja reenvia até o limite de tentativas
      await confirmar(cupom.id, false, error.message).catch(() => {});
      log(`falha ao imprimir cupom #${cupom.id}:`, error.message);
    }
  }
}

// -------------------------------------------------------------------- main

log("agente de impressão iniciado");
log(`  loja.......: ${LOJA_URL}`);
log(`  impressora.: \\\\localhost\\${PRINTER}`);
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
