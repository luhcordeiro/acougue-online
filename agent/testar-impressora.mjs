/**
 * Teste da impressora, sem depender da loja.
 *
 * Serve para separar dois problemas que parecem o mesmo: "a impressora não
 * imprime" e "a loja não está mandando cupom".
 *
 * Uso: node testar-impressora.mjs
 */

import { carregarEnv, primeiraLinha } from "./config.mjs";
import { buildEscPos } from "./escpos.mjs";
import { enviarParaImpressora, listarImpressoras } from "./imprimir.mjs";

carregarEnv();

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

Acentuacao: açougue, linguiça, pão, coração
Cortes....: MOÍDO, BIFES, PEÇA INTEIRA
Produtos..: ACÉM, SUÍNA, MIÚDOS
Valores...: R$ 1.234,56

================================================
        O papel deve ser cortado abaixo
`;

console.log(`Enviando para a impressora "${PRINTER}"...`);

try {
  const resultado = await enviarParaImpressora(buildEscPos(texto), PRINTER);
  console.log(resultado);
  console.log("");
  console.log("Confira no papel:");
  console.log("  1. o cupom saiu inteiro");
  console.log("  2. os acentos aparecem (acougue, MOIDO, ACEM com acento)");
  console.log("  3. o papel foi cortado");
} catch (error) {
  console.error("");
  console.error("FALHOU:", primeiraLinha(error.message));
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
