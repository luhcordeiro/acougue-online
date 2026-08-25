/**
 * Importa o catálogo a partir do relatório de produtos do PDV (PDF).
 *
 * Gera SQL idempotente para o D1 (insere só o que ainda não existe pelo nome).
 *
 * Uso:
 *   node scripts/import-pdv-pdf.mjs <arquivo.txt> > import.generated.sql
 *   npx wrangler d1 execute acougue-online --local --file=import.generated.sql
 *
 * O texto do PDF é extraído antes (o parser espera as linhas na ordem do
 * relatório: código, nome, valor à vista, quantidade, valor a prazo).
 *
 * Duas regras não óbvias:
 *
 * 1. O relatório não diz se o item é vendido a peso ou por peça, mas o PDV
 *    entrega isso pelo acumulado: item pesado acumula quantidade fracionada
 *    (ACÉM: 152.596,283) e item unitário acumula inteira (AÇAFRÃO: -285,000).
 *    É assim que definimos a unidade de venda de cada produto.
 *
 * 2. O relatório também traz lançamentos que não são produto (taxa de entrega,
 *    acréscimo, diferença de caixa, boi inteiro). Esses são descartados.
 */

import { readFileSync } from "node:fs";

/** Lançamentos internos do PDV que não podem virar produto da loja. */
const NAO_E_PRODUTO = [
  /^TAXA DE ENTREGA/i,
  /^ACR[EÉ]SCIMO/i,
  /^DIFEREN[CÇ]A DE CAIXA/i,
  /^BOI$/i,
];

/**
 * Itens que o PDV acumula fracionado, mas que na loja se vendem por peça.
 * Sem esta lista eles entrariam como "por quilo" e o cliente veria
 * "Paçoca 90g - R$ 2,50/kg".
 */
const VENDIDO_POR_PECA = [
  // o PDV grava com e sem cedilha, dependendo do cadastro
  /^TRIPA PARA LINGUI[CÇ]A/i, // vendida por metro
  /^SPRIT /i, // refrigerante 2 L
  /^PA[CÇ]OCA CASEIRA/i, // pacote de 90 g
];

/**
 * Categorias inferidas pelo nome. A ordem importa: a primeira que casar vence,
 * por isso aves e suínos vêm antes de bovinos, que é o padrão.
 */
const CATEGORIAS = [
  {
    nome: "Linguiças e Embutidos",
    descricao: "Linguiças, salsichas e embutidos",
    padroes: [/LINGUI[CÇ]A/i, /SALSICHA/i, /CALABRESA/i],
  },
  {
    nome: "Aves",
    descricao: "Frango, peru e outras aves",
    padroes: [
      /FRANGO/i, /^ASA/i, /COXA/i, /SOBRECOXA/i, /COXINHA DA ASA/i,
      /TULIPA/i, /MOELA/i, /PESCO[CÇ]O/i, /^PERU/i, /P[EÉ] DE FRANGO/i,
      /MEDALH[AÃ]O/i, /EMPANADO/i,
    ],
  },
  {
    nome: "Carnes Suínas",
    descricao: "Cortes de porco",
    padroes: [
      /PORCO/i, /SU[IÍ]N[AO]/i, /PERNIL/i, /BACON/i, /COSTELINHA/i,
      /PANCETA/i, /TOUCINHO/i, /LEIT[OÃ]A?/i, /LEIT[AÃ]O/i, /JOELHO/i,
      /ORELHA/i, /^PELE DE/i, /COPA LOMBO/i, /^LOMBO/i, /^PALETA SU/i,
      /BANHA/i, /^CHULETA SU/i,
    ],
  },
  {
    nome: "Preparados e Assados",
    descricao: "Espetinhos, assados e produtos prontos",
    padroes: [
      /ESPETINHO/i, /KAFTA/i, /KIBE/i, /ASSAD[AO]/i, /RECHEAD[AO]/i,
      /MAIONESE/i, /FEIJOADA/i, /CHURRASCO/i, /CHURASCO/i,
    ],
  },
  {
    nome: "Miúdos",
    descricao: "Fígado, coração, mocotó e outros",
    padroes: [
      /F[IÍ]GADO/i, /CORA[CÇ][AÃ]O/i, /^BOFE/i, /^BUCHO/i, /MOCOT[OÓ]/i,
      /^RIM /i, /L[IÍ]NGUA/i, /RABADA/i, /^GARR[AÃ]O/i, /^SUAN/i,
    ],
  },
  {
    nome: "Outros",
    descricao: "Demais itens do açougue",
    padroes: [/RA[CÇ][AÃ]O/i, /CHARQUE/i],
  },
];

/** Para o que é vendido por peça, o padrão é mercearia. */
const CATEGORIAS_MERCEARIA = [
  {
    nome: "Bebidas",
    descricao: "Águas, refrigerantes e sucos",
    padroes: [
      /^AGUA /i, /^ÁGUA /i, /REFRIGERANTE/i, /^SUCO/i, /^CERVEJA/i,
      /COCA[- ]COLA/i, /^GUARAN/i, /^SPRIT/i, /^FANTA/i, /^PEPSI/i,
      /ENERG[EÉ]TICO/i, /^H2O/i,
    ],
    excecoes: [/AGUA SANITARIA/i, /ÁGUA SANIT[AÁ]RIA/i],
  },
  {
    nome: "Limpeza e Higiene",
    descricao: "Produtos de limpeza e higiene",
    padroes: [
      /AGUA SANITARIA/i, /ÁGUA SANIT[AÁ]RIA/i, /DETERGENTE/i, /SAB[AÃ]O/i,
      /SABONETE/i, /DESINFETANTE/i, /PAPEL HIGI/i, /AMACIANTE/i, /ESPONJA/i,
      /ALVEJANTE/i, /CLORO/i,
    ],
  },
];

const CATEGORIA_MERCEARIA = {
  nome: "Mercearia",
  descricao: "Itens de mercearia vendidos por unidade",
};

const CATEGORIA_PADRAO = {
  nome: "Carnes Bovinas",
  descricao: "Cortes bovinos",
};

function classificar(nome, unidade) {
  if (unidade === "un") {
    for (const categoria of CATEGORIAS_MERCEARIA) {
      if (categoria.excecoes?.some(p => p.test(nome))) continue;
      if (categoria.padroes.some(p => p.test(nome))) return categoria;
    }
    return CATEGORIA_MERCEARIA;
  }

  for (const categoria of CATEGORIAS) {
    if (categoria.padroes.some(p => p.test(nome))) return categoria;
  }
  return CATEGORIA_PADRAO;
}

const NUMERO = /^-?[\d.]+,\d+$/;
const paraNumero = s => Number(s.replace(/\./g, "").replace(",", "."));

function extrair(texto) {
  const linhas = texto.split("\n").map(l => l.trim());
  const registros = [];

  for (let i = 0; i < linhas.length - 4; ) {
    const [codigo, nome, vista, qtde, prazo] = linhas.slice(i, i + 5);

    const valido =
      /^\d+$/.test(codigo) &&
      nome &&
      !/^\d+$/.test(nome) &&
      NUMERO.test(vista) &&
      NUMERO.test(qtde) &&
      NUMERO.test(prazo);

    if (!valido) {
      i += 1;
      continue;
    }

    registros.push({
      codigo: Number(codigo),
      nome,
      preco: paraNumero(vista),
      quantidade: paraNumero(qtde),
    });
    i += 5;
  }

  return registros;
}

const aspas = v => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

/** Capitaliza: o PDV grava tudo em caixa alta, que fica agressivo na vitrine. */
function titulo(nome) {
  const minusculas = new Set(["de", "do", "da", "dos", "das", "e", "com", "sem", "para", "p/", "a", "o", "em"]);
  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((palavra, i) =>
      i > 0 && minusculas.has(palavra)
        ? palavra
        : palavra.charAt(0).toUpperCase() + palavra.slice(1)
    )
    .join(" ");
}

// ---------------------------------------------------------------- execução

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("uso: node scripts/import-pdv-pdf.mjs <texto-extraido.txt>");
  process.exit(1);
}

const registros = extrair(readFileSync(arquivo, "utf-8"));

const vendaveis = registros
  .filter(r => !NAO_E_PRODUTO.some(p => p.test(r.nome)) && r.preco > 0)
  .map(r => {
    const fracionado = Math.abs(r.quantidade) % 1 > 0.0001;
    const porPeca = !fracionado || VENDIDO_POR_PECA.some(p => p.test(r.nome));
    return { ...r, unidade: porPeca ? "un" : "kg" };
  });

// deduplica por nome, mantendo o primeiro
const vistos = new Set();
const produtos = vendaveis.filter(r => {
  const chave = r.nome.toUpperCase();
  if (vistos.has(chave)) return false;
  vistos.add(chave);
  return true;
});

const usadas = new Map();
for (const p of produtos) {
  const c = classificar(p.nome, p.unidade);
  usadas.set(c.nome, c.descricao);
}

const linhas = [];
linhas.push("-- Gerado por scripts/import-pdv-pdf.mjs - nao editar a mao");
linhas.push(`-- ${produtos.length} produtos de ${registros.length} lancamentos no relatorio`);
linhas.push("");

for (const [nome, descricao] of usadas) {
  linhas.push(
    `INSERT INTO categories (name, description) SELECT ${aspas(nome)}, ${aspas(descricao)} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ${aspas(nome)});`
  );
}
linhas.push("");

for (const p of produtos) {
  const categoria = classificar(p.nome, p.unidade).nome;
  const nome = titulo(p.nome);
  const centavos = Math.round(p.preco * 100);

  linhas.push(
    `INSERT INTO products (name, description, categoryId, price, unit, stockKg, available) ` +
      `SELECT ${aspas(nome)}, NULL, (SELECT id FROM categories WHERE name = ${aspas(categoria)}), ` +
      `${centavos}, ${aspas(p.unidade)}, 0, 1 ` +
      `WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ${aspas(nome)});`
  );
}

process.stdout.write(linhas.join("\n") + "\n");

console.error(`lancamentos no relatorio: ${registros.length}`);
console.error(`produtos importados: ${produtos.length}`);
console.error(`  a peso (kg): ${produtos.filter(p => p.unidade === "kg").length}`);
console.error(`  por peca (un): ${produtos.filter(p => p.unidade === "un").length}`);
console.error(`descartados (nao sao produto): ${registros.length - produtos.length}`);
