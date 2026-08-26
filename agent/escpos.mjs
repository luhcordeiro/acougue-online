/**
 * Conversao do cupom em texto para ESC/POS.
 *
 * O servidor manda texto puro; quem entende de impressora e o agente. Assim a
 * loja nao precisa saber nada sobre o modelo instalado no balcao.
 *
 * Testado na Elgin i9 (80mm), que segue o ESC/POS padrao da Epson.
 *
 * ATENCAO: este arquivo e propositalmente 100% ASCII. Ele viaja entre
 * computadores por copia, e qualquer editor que salve em ANSI corromperia
 * caracteres acentuados escritos direto no codigo - quebrando a tabela abaixo
 * e fazendo todo acento sair como "?" no cupom, sem nenhum aviso. Por isso os
 * caracteres sao escritos como \uXXXX.
 */

const ESC = 0x1b;
const GS = 0x1d;

/**
 * Marcadores vindos do cupom (shared/receipt.ts).
 *
 * A loja manda texto puro com estes dois caracteres de controle em volta do
 * que deve sair destacado; aqui eles viram comandos da impressora.
 */
const MARCA_DESTAQUE_ON = 0x01; // SOH
const MARCA_DESTAQUE_OFF = 0x02; // STX

/**
 * ESC ! n - modo de impressao.
 * bit 3 = negrito, bit 4 = altura dupla.
 *
 * Sem largura dupla de proposito: ela reduz as colunas pela metade e quebraria
 * o alinhamento do cupom, que e montado para 48 (ou 32) caracteres.
 */
const DESTAQUE_LIGA = [ESC, 0x21, 0x08 | 0x10];
const DESTAQUE_DESLIGA = [ESC, 0x21, 0x00];

/**
 * A impressora nao fala UTF-8: os acentos sairiam como lixo.
 * A CP850 cobre o portugues e e a pagina de codigo padrao da Elgin i9.
 */
const CP850 = {
  "\u00c7": 0x80, // C cedilha maiusculo
  "\u00fc": 0x81,
  "\u00e9": 0x82, // e agudo
  "\u00e2": 0x83,
  "\u00e4": 0x84,
  "\u00e0": 0x85,
  "\u00e5": 0x86,
  "\u00e7": 0x87, // c cedilha
  "\u00ea": 0x88,
  "\u00eb": 0x89,
  "\u00e8": 0x8a,
  "\u00ef": 0x8b,
  "\u00ee": 0x8c,
  "\u00ec": 0x8d,
  "\u00c4": 0x8e,
  "\u00c5": 0x8f,
  "\u00c9": 0x90, // E agudo maiusculo
  "\u00e6": 0x91,
  "\u00c6": 0x92,
  "\u00f4": 0x93,
  "\u00f6": 0x94,
  "\u00f2": 0x95,
  "\u00fb": 0x96,
  "\u00f9": 0x97,
  "\u00ff": 0x98,
  "\u00d6": 0x99,
  "\u00dc": 0x9a,
  "\u00f8": 0x9b,
  "\u00a3": 0x9c,
  "\u00d8": 0x9d,
  "\u00e1": 0xa0, // a agudo
  "\u00ed": 0xa1, // i agudo
  "\u00f3": 0xa2, // o agudo
  "\u00fa": 0xa3, // u agudo
  "\u00f1": 0xa4,
  "\u00d1": 0xa5,
  "\u00aa": 0xa6,
  "\u00ba": 0xa7,
  "\u00bf": 0xa8,
  "\u00c1": 0xb5,
  "\u00c2": 0xb6,
  "\u00c0": 0xb7,
  "\u00e3": 0xc6, // a til
  "\u00c3": 0xc7, // A til maiusculo
  "\u00ca": 0xd2,
  "\u00cb": 0xd3,
  "\u00c8": 0xd4,
  "\u00cd": 0xd6, // I agudo maiusculo
  "\u00ce": 0xd7,
  "\u00cf": 0xd8,
  "\u00d3": 0xe0, // O agudo maiusculo
  "\u00df": 0xe1,
  "\u00d4": 0xe2, // O circunflexo maiusculo
  "\u00d2": 0xe3,
  "\u00f5": 0xe4, // o til
  "\u00d5": 0xe5, // O til maiusculo
  "\u00b5": 0xe6,
  "\u00da": 0xe9, // U agudo maiusculo
  "\u00db": 0xea,
  "\u00d9": 0xeb,
  "\u00fd": 0xec,
  "\u00dd": 0xed,
  "\u00b0": 0xf8, // grau
  "\u00b7": 0xfa,
  "\u00b2": 0xfd,
};

/**
 * Converte para CP850 e troca os marcadores por comandos de destaque.
 * O que nao existir na tabela vira "?" em vez de lixo.
 */
export function toCp850(text) {
  const bytes = [];

  for (const ch of text) {
    const code = ch.codePointAt(0);

    if (code === MARCA_DESTAQUE_ON) {
      bytes.push(...DESTAQUE_LIGA);
      continue;
    }

    if (code === MARCA_DESTAQUE_OFF) {
      bytes.push(...DESTAQUE_DESLIGA);
      continue;
    }

    if (code < 0x80) {
      bytes.push(code);
      continue;
    }

    const mapeado = CP850[ch];
    bytes.push(mapeado ?? 0x3f); // "?"
  }

  return Buffer.from(bytes);
}

/**
 * Monta o job completo: inicializa, imprime, avanca o papel e corta.
 *
 * O corte e o que faz a diferenca no balcao - sem ele alguem precisa rasgar
 * cada cupom na serrilha, com o pedido seguinte ja saindo por cima.
 */
export function buildEscPos(text, { cut = true, feedLines = 4 } = {}) {
  const partes = [];

  // ESC @ - reinicia a impressora, limpando formatacao de um job anterior
  partes.push(Buffer.from([ESC, 0x40]));

  // ESC t 2 - seleciona a pagina de codigo CP850
  partes.push(Buffer.from([ESC, 0x74, 0x02]));

  partes.push(toCp850(text));

  // avanco antes do corte, senao o corte cai no meio da ultima linha
  partes.push(Buffer.from([ESC, 0x64, feedLines]));

  if (cut) {
    // GS V 66 0 - corte parcial, deixando uma ponta presa
    partes.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
  }

  return Buffer.concat(partes);
}
