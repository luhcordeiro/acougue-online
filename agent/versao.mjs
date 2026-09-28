/**
 * Versao do agente, avisada a loja em cada consulta a fila.
 *
 * Serve para responder "a pasta foi copiada?" sem imprimir nada. O agente
 * viaja entre computadores por copia manual, e uma versao antiga NAO da erro:
 * ela so ignora em silencio o que nao conhece. Foi o que aconteceu com o
 * tamanho da letra - a loja mandava "grande", o agente antigo imprimia
 * pequeno, e nao havia como saber de onde vinha a diferenca.
 *
 * Suba o numero sempre que a loja passar a mandar algo que o agente precise
 * entender, e anote aqui o que mudou.
 *
 *   1 - primeira versao
 *   2 - passa a respeitar o tamanho da letra que vem da loja
 */
export const VERSAO_AGENTE = 2;

/** Recursos desta versao, para a loja avisar o que falta. */
export const RECURSOS = ["tamanho-da-letra"];
