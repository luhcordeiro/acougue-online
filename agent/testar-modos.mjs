/**
 * Descobre COMO a impressora aceita os dados.
 *
 * Papel saindo em branco quase sempre significa que o driver do Windows
 * descartou os comandos ESC/POS em vez de repassá-los. Este teste envia
 * variações, uma de cada vez, para achar qual delas o driver deixa passar.
 *
 * Uso: node testar-modos.mjs
 */

import { carregarEnv, primeiraLinha } from "./config.mjs";
import { enviarParaImpressora } from "./imprimir.mjs";

carregarEnv();

const PRINTER = process.env.PRINTER ?? "";

if (!PRINTER) {
  console.error("Defina PRINTER no arquivo .env");
  process.exit(1);
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const texto = n =>
  Buffer.from(
    `TESTE ${n}\n` +
      `Se este texto saiu, o modo ${n} funciona.\n` +
      `Anote o numero e avise.\n\n\n`,
    "ascii"
  );

const modos = [
  {
    n: 1,
    nome: "Texto puro, sem nenhum comando",
    bytes: () => texto(1),
  },
  {
    n: 2,
    nome: "Texto + avanco de papel (sem ESC @)",
    bytes: () => Buffer.concat([texto(2), Buffer.from([ESC, 0x64, 0x04])]),
  },
  {
    n: 3,
    nome: "ESC @ (init) + texto",
    bytes: () => Buffer.concat([Buffer.from([ESC, 0x40]), texto(3)]),
  },
  {
    n: 4,
    nome: "ESC @ + texto + corte total",
    bytes: () =>
      Buffer.concat([
        Buffer.from([ESC, 0x40]),
        texto(4),
        Buffer.from([ESC, 0x64, 0x04]),
        Buffer.from([GS, 0x56, 0x41, 0x00]),
      ]),
  },
  {
    n: 5,
    nome: "Completo: ESC @ + CP850 + texto + corte parcial",
    bytes: () =>
      Buffer.concat([
        Buffer.from([ESC, 0x40]),
        Buffer.from([ESC, 0x74, 0x02]),
        texto(5),
        Buffer.from([ESC, 0x64, 0x04]),
        Buffer.from([GS, 0x56, 0x42, 0x00]),
      ]),
  },
  {
    n: 6,
    nome: "Texto terminando com muitas quebras de linha",
    bytes: () => Buffer.concat([texto(6), Buffer.alloc(8, LF)]),
  },
];

console.log("");
console.log("============================================================");
console.log("  DESCOBRINDO COMO A IMPRESSORA ACEITA OS DADOS");
console.log("============================================================");
console.log("");
console.log(`Impressora: ${PRINTER}`);
console.log("");
console.log("Vao sair ate 6 pedacinhos de papel, numerados de 1 a 6.");
console.log("Anote quais NUMEROS realmente sairam impressos.");
console.log("");

for (const modo of modos) {
  const dados = modo.bytes();
  process.stdout.write(`  Modo ${modo.n}: ${modo.nome}... `);

  try {
    await enviarParaImpressora(dados, PRINTER);
    console.log(`enviado (${dados.length} bytes)`);
  } catch (error) {
    console.log(`FALHOU - ${primeiraLinha(error.message)}`);
  }

  // pausa para o papel sair e dar para separar um teste do outro
  await new Promise(r => setTimeout(r, 2500));
}

console.log("");
console.log("============================================================");
console.log("  Confira o papel e anote quais numeros sairam.");
console.log("");
console.log("  Nenhum saiu  -> o driver nao repassa dados crus;");
console.log("                  precisamos instalar a impressora como");
console.log("                  'Generic / Text Only'.");
console.log("  Alguns sairam -> ajusto o agente para usar aquele modo.");
console.log("============================================================");
