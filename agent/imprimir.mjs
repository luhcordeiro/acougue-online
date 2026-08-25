/**
 * Envio para a impressora.
 *
 * Usa o spooler do Windows com tipo de dados RAW, via raw-print.ps1. Não passa
 * pelo compartilhamento (\\localhost\NOME) porque aquele caminho depende de
 * permissão de rede e responde "Acesso negado" com frequência — inclusive para
 * o próprio usuário da máquina.
 */

import { execFile } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const AQUI = dirname(fileURLToPath(import.meta.url));

/**
 * @param {Buffer} bytes conteúdo já em ESC/POS
 * @param {string} printer nome da impressora no Windows, ou "SIMULADO"
 * @returns {Promise<string>} mensagem do que aconteceu
 */
export async function enviarParaImpressora(bytes, printer) {
  // Modo de teste: grava o que sairia, sem imprimir. Serve para validar a
  // ligação com a loja antes de a impressora estar configurada.
  if (printer.toUpperCase() === "SIMULADO") {
    const destino = join(tmpdir(), `cupom-simulado-${Date.now()}.bin`);
    writeFileSync(destino, bytes);
    return `[simulado] gravado em ${destino}`;
  }

  const arquivo = join(tmpdir(), `cupom-${Date.now()}.bin`);
  writeFileSync(arquivo, bytes);

  try {
    const { stdout } = await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(AQUI, "raw-print.ps1"),
        "-Printer",
        printer,
        "-File",
        arquivo,
      ],
      { windowsHide: true }
    );

    return stdout.trim() || `${bytes.length} bytes enviados`;
  } finally {
    try {
      unlinkSync(arquivo);
    } catch {
      // arquivo temporário: falhar ao apagar não é problema
    }
  }
}

/** Impressoras instaladas, para ajudar quem errou o nome. */
export async function listarImpressoras() {
  try {
    const { stdout } = await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-Printer | Select-Object -ExpandProperty Name",
      ],
      { windowsHide: true }
    );

    return stdout
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
