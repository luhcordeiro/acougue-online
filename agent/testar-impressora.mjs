/**
 * Teste da impressora, sem depender da loja.
 *
 * Serve para separar dois problemas que parecem o mesmo: "a impressora não
 * imprime" e "a loja não está mandando cupom".
 *
 * Uso: node testar-impressora.mjs
 */

import { readFileSync } from "node:fs";
import { buildEscPos } from "./escpos.mjs";
import { enviarParaImpressora, listarImpressoras } from "./imprimir.mjs";

try {
  const env = readFileSync(new URL("./.env", import.meta.url), "utf-8");
  for (const linha of env.split("\n")) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;

    const igual = limpa.indexOf("=");
    if (igual < 0) continue;

    const chave = limpa.slice(0, igual).trim();
    if (!process.env[chave]) process.env[chave] = limpa.slice(igual + 1).trim();
  }
} catch {
  // sem .env: usa as variáveis do sistema
}

const PRINTER = process.env.PRINTER ?? "";

if (!PRINTER) {
  console.error("Defina PRINTER no arquivo .env");
  process.exit(1);
}

const texto = `================================================
                 TESTE DE IMPRESSAO
================================================
Se voce esta lendo isto, a impressora esta
configurada corretamente.

Acentuacao: acougue, linguica, picanha, pao
Cortes....: MOIDO, BIFES, PECA INTEIRA
Valores...: R$ 1.234,56

================================================
        O papel deve ser cortado abaixo
`;

console.log(`Enviando para a impressora "${PRINTER}"...`);

try {
  const resultado = await enviarParaImpressora(buildEscPos(texto), PRINTER);
  console.log(resultado);
  console.log("");
  console.log("Confira se o cupom saiu e se o papel foi cortado.");
} catch (error) {
  console.error("");
  console.error("FALHOU:", error.message.split("\n")[0]);
  console.error("");

  const impressoras = await listarImpressoras();

  if (impressoras.length > 0) {
    console.error("Impressoras instaladas neste computador:");
    for (const nome of impressoras) {
      console.error(`   ${nome}`);
    }
    console.error("");
    console.error("Copie o nome EXATO de uma delas para PRINTER no .env,");
    console.error("com os parenteses e espacos, se houver.");
  } else {
    console.error("Nenhuma impressora encontrada neste computador.");
  }

  process.exit(1);
}
