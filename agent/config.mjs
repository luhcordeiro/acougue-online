/**
 * Leitura da configuração do agente.
 *
 * Fica em módulo próprio porque o agente, o teste de impressora e o
 * diagnóstico precisam ler o mesmo .env do mesmo jeito.
 */

import { readFileSync } from "node:fs";

/**
 * Carrega o .env que estiver ao lado deste arquivo.
 *
 * Variáveis já definidas no sistema têm prioridade, para dar como sobrescrever
 * sem editar o arquivo.
 */
export function carregarEnv() {
  try {
    const conteudo = readFileSync(new URL("./.env", import.meta.url), "utf-8");

    for (const linha of conteudo.split(/\r?\n/)) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith("#")) continue;

      const igual = limpa.indexOf("=");
      if (igual < 0) continue;

      const chave = limpa.slice(0, igual).trim();
      if (!process.env[chave]) {
        process.env[chave] = limpa.slice(igual + 1).trim();
      }
    }

    return true;
  } catch {
    // sem .env: usa só as variáveis do sistema
    return false;
  }
}

/** Mensagens de erro do Windows vêm com várias linhas; só a primeira importa. */
export function primeiraLinha(texto) {
  return String(texto).split(/\r?\n/)[0].trim();
}
