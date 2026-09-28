import * as db from "./db";
import { describe, expect, it } from "vitest";

/**
 * A loja já tem uma configuração gravada, de antes de existir o tamanho da
 * letra. Ela precisa continuar sendo lida — um campo novo não pode derrubar
 * a impressão automática de quem já estava usando.
 */
describe("configuração de impressão", () => {
  it("completa o tamanho que falta na configuração antiga", async () => {
    // exatamente o que está gravado em produção hoje
    await db.setSystemSetting(
      "order_alerts",
      '{"notify":true,"autoPrint":true,"receiptWidth":"80mm"}'
    );

    const alerts = await db.getOrderAlerts();

    expect(alerts.notify).toBe(true);
    expect(alerts.autoPrint).toBe(true);
    expect(alerts.receiptWidth).toBe("80mm");
    expect(alerts.receiptSize).toBe("grande");
  });

  it("respeita o tamanho escolhido pela lojista", async () => {
    await db.setOrderAlerts({
      notify: true,
      autoPrint: true,
      receiptWidth: "80mm",
      receiptSize: "normal",
    });

    expect((await db.getOrderAlerts()).receiptSize).toBe("normal");
  });

  it("recusa tamanho inválido em vez de repassar para a impressora", async () => {
    await db.setSystemSetting("order_alerts", '{"receiptSize":"gigante"}');

    expect((await db.getOrderAlerts()).receiptSize).toBe("grande");
  });

  it("sobrevive a configuração corrompida", async () => {
    await db.setSystemSetting("order_alerts", "isto nao e json");

    const alerts = await db.getOrderAlerts();
    expect(alerts).toEqual(db.DEFAULT_ORDER_ALERTS);
  });
});
