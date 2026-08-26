import { MARK_EMPHASIS_OFF, MARK_EMPHASIS_ON } from "@shared/receipt";

/**
 * Impressão do cupom em impressora térmica.
 *
 * A térmica é usada como impressora comum do sistema: mandamos texto
 * monoespaçado e o driver cuida do resto. Não há acesso direto à porta da
 * impressora pelo navegador — por isso o cupom é texto puro, que qualquer
 * driver térmico imprime bem.
 *
 * IMPORTANTE sobre impressão automática: o navegador sempre abre a caixa de
 * diálogo de impressão. Para imprimir sem confirmação, o Chrome precisa ser
 * aberto com a flag --kiosk-printing.
 */

const LARGURA_MM = { "58mm": 58, "80mm": 80 } as const;

export type PrintWidth = keyof typeof LARGURA_MM;

function buildDocument(text: string, width: PrintWidth): string {
  const mm = LARGURA_MM[width];
  const escapado = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // os marcadores de destaque do cupom viram negrito no HTML; sem isso
    // apareceriam como caracteres estranhos na impressao pelo navegador
    .split(MARK_EMPHASIS_ON)
    .join("<b>")
    .split(MARK_EMPHASIS_OFF)
    .join("</b>");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Cupom</title>
<style>
  /* sem margem: a bobina não tem onde desperdiçar papel */
  @page { size: ${mm}mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; }
  pre {
    margin: 0;
    padding: 2mm;
    font-family: "Courier New", Courier, monospace;
    font-size: ${width === "58mm" ? "10px" : "12px"};
    line-height: 1.25;
    white-space: pre;
  }
</style>
</head>
<body><pre>${escapado}</pre></body>
</html>`;
}

/**
 * Imprime dentro de um iframe oculto.
 *
 * Usar iframe em vez de window.open evita que o bloqueador de pop-up impeça a
 * impressão automática, que acontece sem clique do usuário.
 */
export function printReceipt(text: string, width: PrintWidth = "80mm"): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // dá tempo do diálogo abrir antes de remover o iframe
      setTimeout(() => iframe.remove(), 60_000);
    }
  };

  document.body.appendChild(iframe);
  iframe.srcdoc = buildDocument(text, width);
}

/**
 * Contexto de áudio compartilhado.
 *
 * O navegador cria o AudioContext em estado "suspended" e só libera depois de
 * um clique do usuário. Como o alerta toca sozinho, sem clique, seria comum o
 * bipe falhar em silêncio justamente no cenário real: painel aberto no balcão,
 * ninguém tocando na tela. Por isso guardamos um contexto só e o destravamos
 * na primeira interação.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

/** true quando o navegador ainda não liberou o som. */
export function isAudioBlocked(): boolean {
  return audioCtx !== null && audioCtx.state === "suspended";
}

/**
 * Destrava o áudio. Precisa ser chamado a partir de um gesto do usuário —
 * um clique qualquer na página serve.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

function beep(ctx: AudioContext, atraso: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + atraso);
  gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + atraso + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + atraso + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + atraso);
  osc.stop(ctx.currentTime + atraso + 0.2);
}

/**
 * Bipe de aviso de pedido novo.
 *
 * Gerado por Web Audio em vez de arquivo de som: não depende de asset, toca
 * na hora e não some se o arquivo for movido.
 */
export function playOrderAlert(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const tocar = () => {
      // três bipes: um açougue é barulhento, e um só passa despercebido
      [0, 0.25, 0.5].forEach(atraso => beep(ctx, atraso));
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(tocar).catch(() => {});
      return;
    }

    tocar();
  } catch {
    // som é conveniência; falhar aqui não pode atrapalhar o pedido
  }
}

/** Aviso do sistema operacional, para quando o painel está em outra aba. */
export function showOrderNotification(title: string, body: string): void {
  if (typeof Notification === "undefined") return;

  if (Notification.permission === "granted") {
    new Notification(title, { body, tag: "novo-pedido" });
    return;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission()
      .then(permissao => {
        if (permissao === "granted") {
          new Notification(title, { body, tag: "novo-pedido" });
        }
      })
      .catch(() => {});
  }
}
