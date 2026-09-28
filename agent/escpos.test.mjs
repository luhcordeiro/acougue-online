/**
 * Testes do ESC/POS do agente.
 *
 * Rodam em Node puro (node --test), fora do vitest: o agente e um script
 * solto, copiado para o computador do balcao, e nao carrega o projeto.
 *
 * Uso: node --test agent/
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEscPos, toCp850 } from "./escpos.mjs";

const hex = buf => buf.toString("hex");
const ESC_MODO = "1b21"; // ESC ! n

test("fonte A e escolhida explicitamente", () => {
  // sem ESC M 0 valeria o padrao gravado na impressora, e duas Elgin
  // configuradas diferente imprimiriam o mesmo cupom em tamanhos diferentes
  assert.match(hex(buildEscPos("A")), /1b4d00/);
});

test("normal imprime sem altura dupla", () => {
  assert.match(hex(buildEscPos("A", { cut: false, feedLines: 0 })), new RegExp(ESC_MODO + "00"));
});

test("grande liga altura dupla no corpo", () => {
  assert.match(hex(buildEscPos("A", { cut: false, feedLines: 0, grande: true })), new RegExp(ESC_MODO + "10"));
});

test("largura dupla nunca e usada", () => {
  // largura dupla (bit 5, 0x20) cortaria as colunas de 48 para 24 e
  // desalinharia o cupom inteiro
  for (const grande of [false, true]) {
    const bytes = Array.from(buildEscPos("A", { grande }));
    for (let i = 0; i < bytes.length - 2; i++) {
      if (bytes[i] === 0x1b && bytes[i + 1] === 0x21) {
        assert.equal(bytes[i + 2] & 0x20, 0, "modo com largura dupla: " + bytes[i + 2]);
      }
    }
  }
});

test("destaque continua distinguivel com a letra grande", () => {
  // se destaque e corpo virassem o mesmo modo, o tipo de corte deixaria de
  // se destacar - e e a linha que, passando batida, faz o pedido sair errado
  const normal = hex(toCp850("\u0001X\u0002"));
  const grande = hex(toCp850("\u0001X\u0002", { grande: true }));

  assert.match(normal, new RegExp(ESC_MODO + "18"), "destaque no normal");
  assert.match(grande, new RegExp(ESC_MODO + "18"), "destaque no grande");

  // e cada um volta para o SEU modo de corpo
  assert.ok(normal.endsWith("2100"), "normal volta para modo 0x00");
  assert.ok(grande.endsWith("2110"), "grande volta para altura dupla");
});

test("acentos do portugues sobrevivem nos dois tamanhos", () => {
  for (const grande of [false, true]) {
    const bytes = Array.from(toCp850("ACÉM LINGUIÇA MOÍDO PÃO CORAÇÃO SUÍNA", { grande }));
    assert.ok(!bytes.includes(0x3f), "algum acento virou '?' (grande=" + grande + ")");
  }
});

test("corte parcial no fim", () => {
  assert.match(hex(buildEscPos("A")), /1d564200$/);
});
