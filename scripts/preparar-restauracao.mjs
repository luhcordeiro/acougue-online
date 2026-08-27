/**
 * Prepara um backup do D1 para ser restaurado.
 *
 * Existe porque o arquivo que sai do `wrangler d1 export` NAO restaura
 * direto. O export grava as tabelas em ordem alfabetica, entao `orderItems`
 * aparece antes de `products`, que ela referencia - e a carga morre em
 * "FOREIGN KEY constraint failed". O `PRAGMA defer_foreign_keys` que o proprio
 * export escreve na primeira linha nao resolve: o wrangler quebra o arquivo em
 * lotes e o PRAGMA nao atravessa o lote seguinte.
 *
 * A saida sao dois arquivos: o esquema e os dados na ordem das dependencias.
 *
 * Uso: node scripts/preparar-restauracao.mjs backup.sql [pasta-de-saida]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const entrada = process.argv[2];
const destino = process.argv[3] ?? dirname(entrada ?? ".");

if (!entrada) {
  console.error("Uso: node scripts/preparar-restauracao.mjs backup.sql [pasta-de-saida]");
  process.exit(1);
}

const sql = readFileSync(entrada, "utf8");
const linhas = sql.split(/\r?\n/);

// ---- separa esquema de dados -------------------------------------------
// Um INSERT do export cabe sempre numa linha so; o resto (CREATE TABLE,
// indices, PRAGMA) pode ocupar varias e por isso e preservado na ordem.
const esquema = [];
const inserts = [];

for (const linha of linhas) {
  if (linha.startsWith("INSERT INTO")) inserts.push(linha);
  else esquema.push(linha);
}

// ---- grafo de dependencias ---------------------------------------------
const blocos = [
  ...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\n\);/g),
];

const dependencias = new Map();
for (const [, tabela, corpo] of blocos) {
  const refs = new Set(
    [...corpo.matchAll(/REFERENCES\s+[`"]?(\w+)[`"]?/g)].map(m => m[1])
  );
  refs.delete(tabela); // auto-referencia nao impede a carga
  dependencias.set(tabela, refs);
}

// ---- ordenacao topologica ----------------------------------------------
/** Tabelas pai primeiro, para nenhum INSERT citar linha que ainda nao existe. */
function ordenar(tabelas) {
  const ordem = [];
  const estado = new Map(); // 1 = visitando, 2 = pronto

  const visitar = tabela => {
    if (estado.get(tabela) === 2) return;
    if (estado.get(tabela) === 1) {
      // ciclo entre tabelas: nao da para ordenar, avisa em vez de gerar
      // um arquivo que falharia so na hora da restauracao
      throw new Error(
        `Ciclo de chave estrangeira envolvendo "${tabela}". ` +
          `Restaure o esquema, desligue as FKs e carregue os dados a mao.`
      );
    }

    estado.set(tabela, 1);
    for (const pai of dependencias.get(tabela) ?? []) {
      if (tabelas.has(pai)) visitar(pai);
    }
    estado.set(tabela, 2);
    ordem.push(tabela);
  };

  for (const t of tabelas) visitar(t);
  return ordem;
}

const porTabela = new Map();
for (const linha of inserts) {
  const m = linha.match(/^INSERT INTO\s+[`"]?(\w+)[`"]?/);
  if (!m) continue;
  const tabela = m[1];
  if (!porTabela.has(tabela)) porTabela.set(tabela, []);
  porTabela.get(tabela).push(linha);
}

// sqlite_sequence guarda os contadores de AUTOINCREMENT e e escrita pelo
// proprio SQLite conforme as linhas entram; carregar por ultimo
const interna = "sqlite_sequence";
const comuns = new Set([...porTabela.keys()].filter(t => t !== interna));

const ordenadas = ordenar(comuns);
if (porTabela.has(interna)) ordenadas.push(interna);

const dados = [];
for (const tabela of ordenadas) {
  dados.push(`-- ${tabela} (${porTabela.get(tabela).length} linhas)`);
  dados.push(...porTabela.get(tabela));
}

mkdirSync(destino, { recursive: true });
const arqEsquema = join(destino, "restaurar-1-esquema.sql");
const arqDados = join(destino, "restaurar-2-dados.sql");

writeFileSync(arqEsquema, esquema.join("\n"), "utf8");
writeFileSync(arqDados, dados.join("\n"), "utf8");

console.log(`Ordem de carga: ${ordenadas.join(" -> ")}`);
console.log("");
console.log(`Esquema: ${arqEsquema}`);
console.log(`Dados:   ${arqDados} (${inserts.length} linhas)`);
console.log("");
console.log("Restaure NESTA ordem, trocando <banco> pelo nome do banco:");
console.log(`  npx wrangler d1 execute <banco> --remote --file "${arqEsquema}"`);
console.log(`  npx wrangler d1 execute <banco> --remote --file "${arqDados}"`);
