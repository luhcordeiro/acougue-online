/**
 * Diagnóstico do agente.
 *
 * Verifica cada elo da corrente separadamente — configuração, conexão com a
 * loja, token e impressora — para dizer exatamente onde está o problema, em
 * vez de deixar "não imprime" como única informação.
 *
 * Uso: node diagnostico.mjs
 */

import { carregarEnv, primeiraLinha } from "./config.mjs";
import { buildEscPos } from "./escpos.mjs";
import { enviarParaImpressora, listarImpressoras } from "./imprimir.mjs";

const ok = t => console.log(`  [OK]    ${t}`);
const erro = t => console.log(`  [ERRO]  ${t}`);
const aviso = t => console.log(`  [!]     ${t}`);

console.log("");
console.log("============================================================");
console.log("  DIAGNOSTICO DO AGENTE DE IMPRESSAO");
console.log("============================================================");

// ------------------------------------------------------------ 1. configuração
console.log("");
console.log("1) Configuracao");

const achouEnv = carregarEnv();
if (achouEnv) {
  ok("arquivo .env encontrado");
} else {
  erro("arquivo .env NAO encontrado nesta pasta - rode INSTALAR.bat");
}

const LOJA_URL = (process.env.LOJA_URL ?? "").replace(/\/+$/, "");
const AGENT_TOKEN = process.env.AGENT_TOKEN ?? "";
const PRINTER = process.env.PRINTER ?? "";

if (LOJA_URL) ok(`loja: ${LOJA_URL}`);
else erro("LOJA_URL vazio");

if (AGENT_TOKEN) {
  // mostra só as pontas: o suficiente para comparar, sem expor o token
  const inicio = AGENT_TOKEN.slice(0, 6);
  const fim = AGENT_TOKEN.slice(-6);
  ok(`token: ${inicio}...${fim} (${AGENT_TOKEN.length} caracteres)`);

  if (AGENT_TOKEN.length !== 48) {
    aviso(`o token deveria ter 48 caracteres - pode ter sido cortado ao colar`);
  }
} else {
  erro("AGENT_TOKEN vazio");
}

if (PRINTER) ok(`impressora: ${PRINTER}`);
else erro("PRINTER vazio");

// ------------------------------------------------------------------ 2. loja
console.log("");
console.log("2) Conexao com a loja");

let filaOk = false;

if (LOJA_URL && AGENT_TOKEN) {
  try {
    const resposta = await fetch(`${LOJA_URL}/api/print/jobs`, {
      headers: { authorization: `Bearer ${AGENT_TOKEN}` },
    });

    if (resposta.status === 200) {
      const { jobs } = await resposta.json();
      ok(`loja respondeu - ${jobs.length} cupom(ns) na fila`);
      filaOk = true;
    } else if (resposta.status === 401) {
      erro("token RECUSADO pela loja");
      console.log("          O valor de AGENT_TOKEN no .env nao confere com o");
      console.log("          da loja. Peca o token de novo e cole inteiro.");
    } else if (resposta.status === 503) {
      erro("a loja ainda nao tem o agente configurado");
    } else {
      erro(`loja respondeu ${resposta.status}`);
    }
  } catch (e) {
    erro(`nao consegui falar com a loja: ${primeiraLinha(e.message)}`);
    console.log("          Verifique a internet e o endereco em LOJA_URL.");
  }
} else {
  aviso("pulado: configuracao incompleta");
}

// ------------------------------------------------------------- 3. impressora
console.log("");
console.log("3) Impressora");

const impressoras = await listarImpressoras();

if (impressoras.length === 0) {
  erro("nenhuma impressora instalada neste computador");
} else {
  ok(`${impressoras.length} impressora(s) instalada(s):`);
  for (const nome of impressoras) {
    const marca = nome === PRINTER ? "  <-- configurada" : "";
    console.log(`            ${nome}${marca}`);
  }

  if (PRINTER && PRINTER.toUpperCase() !== "SIMULADO" && !impressoras.includes(PRINTER)) {
    erro(`"${PRINTER}" nao esta na lista acima`);
    console.log("          Copie o nome EXATO de uma delas para PRINTER no .env.");
  }
}

// ---------------------------------------------------------- 4. teste de fogo
console.log("");
console.log("4) Impressao de teste");

if (!PRINTER) {
  aviso("pulado: PRINTER vazio");
} else {
  try {
    const resultado = await enviarParaImpressora(
      buildEscPos("Teste de diagnostico - acougue online\nAcentuacao: acougue, linguica\n"),
      PRINTER
    );
    ok(resultado);
    console.log("          Confira se o cupom saiu na impressora.");
  } catch (e) {
    erro(primeiraLinha(e.message));
  }
}

// ------------------------------------------------------------------ resumo
console.log("");
console.log("============================================================");
if (filaOk) {
  console.log("  A ligacao com a loja esta funcionando.");
  console.log("  Se o cupom de teste nao saiu, o problema e a impressora.");
} else {
  console.log("  A ligacao com a loja NAO esta funcionando.");
  console.log("  Resolva os itens marcados com [ERRO] acima.");
}
console.log("============================================================");
