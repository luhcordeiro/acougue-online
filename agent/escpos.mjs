/**
 * Conversão do cupom em texto para ESC/POS.
 *
 * O servidor manda texto puro; quem entende de impressora é o agente. Assim a
 * loja não precisa saber nada sobre o modelo instalado no balcão.
 *
 * Testado na Elgin i9 (80mm), que segue o ESC/POS padrão da Epson.
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
 * ESC ! n - modo de impressão.
 * bit 3 = negrito, bit 4 = altura dupla.
 *
 * Sem largura dupla de propósito: ela reduz as colunas pela metade e quebraria
 * o alinhamento do cupom, que é montado para 48 (ou 32) caracteres.
 */
const DESTAQUE_LIGA = [ESC, 0x21, 0x08 | 0x10];
const DESTAQUE_DESLIGA = [ESC, 0x21, 0x00];

/**
 * A impressora não fala UTF-8: os acentos sairiam como lixo.
 * A CP850 cobre o português e é a página de código padrão da Elgin i9.
 */
const CP850 = {
  "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ä": 0x84, "à": 0x85,
  "å": 0x86, "ç": 0x87, "ê": 0x88, "ë": 0x89, "è": 0x8a, "ï": 0x8b,
  "î": 0x8c, "ì": 0x8d, "Ä": 0x8e, "Å": 0x8f, "É": 0x90, "æ": 0x91,
  "Æ": 0x92, "ô": 0x93, "ö": 0x94, "ò": 0x95, "û": 0x96, "ù": 0x97,
  "ÿ": 0x98, "Ö": 0x99, "Ü": 0x9a, "ø": 0x9b, "£": 0x9c, "Ø": 0x9d,
  "á": 0xa0, "í": 0xa1, "ó": 0xa2, "ú": 0xa3, "ñ": 0xa4, "Ñ": 0xa5,
  "ª": 0xa6, "º": 0xa7, "¿": 0xa8, "Á": 0xb5, "Â": 0xb6, "À": 0xb7,
  "ã": 0xc6, "Ã": 0xc7, "Ê": 0xd2, "Ë": 0xd3, "È": 0xd4, "Í": 0xd6,
  "Î": 0xd7, "Ï": 0xd8, "Ó": 0xe0, "ß": 0xe1, "Ô": 0xe2, "Ò": 0xe3,
  "õ": 0xe4, "Õ": 0xe5, "µ": 0xe6, "Ú": 0xe9, "Û": 0xea, "Ù": 0xeb,
  "ý": 0xec, "Ý": 0xed, "°": 0xf8, "·": 0xfa, "²": 0xfd,
};

/**
 * Converte para CP850 e troca os marcadores por comandos de destaque.
 * O que não existir na tabela vira "?" em vez de lixo.
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
 * Monta o job completo: inicializa, imprime, avança o papel e corta.
 *
 * O corte é o que faz a diferença no balcão — sem ele alguém precisa rasgar
 * cada cupom na serrilha, com o pedido seguinte já saindo por cima.
 */
export function buildEscPos(text, { cut = true, feedLines = 4 } = {}) {
  const partes = [];

  // ESC @ - reinicia a impressora, limpando formatação de um job anterior
  partes.push(Buffer.from([ESC, 0x40]));

  // ESC t 2 - seleciona a página de código CP850
  partes.push(Buffer.from([ESC, 0x74, 0x02]));

  partes.push(toCp850(text));

  // avanço antes do corte, senão o corte cai no meio da última linha
  partes.push(Buffer.from([ESC, 0x64, feedLines]));

  if (cut) {
    // GS V 66 0 - corte parcial, deixando uma ponta presa
    partes.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
  }

  return Buffer.concat(partes);
}
