import * as db from "./db";
import { describe, expect, it } from "vitest";

/**
 * O agente é copiado à mão para o computador do balcão, e a versão antiga não
 * dá erro: ela ignora em silêncio o que não conhece. Foi assim que a loja
 * mandou "letra grande" e o cupom saiu pequeno, sem nada apontar a causa.
 */
describe("versão do agente de impressão", () => {
  it("não inventa status antes do primeiro contato", async () => {
    await db.setSystemSetting("print_agent_status", "");
    expect(await db.getPrintAgentStatus()).toBeNull();
  });

  it("guarda a versão e o horário do contato", async () => {
    const antes = Date.now();
    await db.recordPrintAgentSeen(2);

    const status = await db.getPrintAgentStatus();
    expect(status?.version).toBe(2);
    expect(status!.lastSeen.getTime()).toBeGreaterThanOrEqual(antes - 2000);
  });

  it("aponta agente atrás da loja", async () => {
    await db.recordPrintAgentSeen(1);

    const status = await db.getPrintAgentStatus();
    expect(status?.version).toBe(1);
    expect(status?.upToDate).toBe(false);
  });

  it("aceita agente na versão esperada", async () => {
    await db.recordPrintAgentSeen(db.VERSAO_AGENTE_ESPERADA);
    expect((await db.getPrintAgentStatus())?.upToDate).toBe(true);
  });

  it("aceita agente mais novo que a loja", async () => {
    // durante uma atualização o balcão pode ficar na frente por alguns minutos
    await db.recordPrintAgentSeen(db.VERSAO_AGENTE_ESPERADA + 1);
    expect((await db.getPrintAgentStatus())?.upToDate).toBe(true);
  });

  it("trata agente sem versão como o mais antigo", async () => {
    // agente de antes deste recurso não manda o cabeçalho
    await db.setSystemSetting(
      "print_agent_status",
      JSON.stringify({ lastSeen: Date.now() })
    );

    const status = await db.getPrintAgentStatus();
    expect(status?.version).toBe(1);
    expect(status?.upToDate).toBe(false);
  });

  it("sobrevive a status corrompido", async () => {
    await db.setSystemSetting("print_agent_status", "isto nao e json");
    expect(await db.getPrintAgentStatus()).toBeNull();
  });
});
