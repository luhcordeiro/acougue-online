/**
 * Teste da impressora, sem depender da loja.
 *
 * Serve para separar dois problemas que parecem o mesmo: "a impressora não
 * imprime" e "a loja não está mandando cupom".
 *
 * Uso: node agent/testar-impressora.mjs
 */

import { execFile } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { buildEscPos } from "./escpos.mjs";

const execFileAsync = promisify(execFile);

try {
  const env = readFileSync(new URL("./.env", import.meta.url), "utf-8");
  for (const linha of env.split("\n")) {
    const [chave, ...resto] = linha.split("=");
    if (chave && resto.length && !process.env[chave.trim()]) {
      process.env[chave.trim()] = resto.join("=").trim();
    }
  }
} catch {}

const PRINTER = process.env.PRINTER ?? "";
if (!PRINTER) {
  console.error("Defina PRINTER em agent/.env");
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

const arquivo = join(tmpdir(), `teste-${Date.now()}.bin`);
writeFileSync(arquivo, buildEscPos(texto));

console.log(`Enviando para \\localhost\${PRINTER}...`);

try {
  await execFileAsync(
    "cmd",
    ["/c", "copy", "/b", arquivo, `\\localhost\${PRINTER}`],
    { windowsHide: true }
  );
  console.log("Enviado. Confira se o cupom saiu e se o papel foi cortado.");
} catch (error) {
  console.error("Falhou:", error.message);
  console.error("");
  console.error("Verifique:");
  console.error(`  1. A impressora esta compartilhada com o nome "${PRINTER}"?`);
  console.error("     Painel de Controle > Dispositivos e Impressoras >");
  console.error("     botao direito > Propriedades da impressora >");
  console.error("     aba Compartilhamento > marcar e definir o nome");
  console.error("  2. O nome do compartilhamento nao pode ter espacos");
  process.exit(1);
} finally {
  try { unlinkSync(arquivo); } catch {}
}
