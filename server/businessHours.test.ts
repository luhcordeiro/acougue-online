import {
  DEFAULT_BUSINESS_HOURS,
  getStoreLocalTime,
  getStoreStatus,
  isValidDayHours,
  normalizeBusinessHours,
  timeToMinutes,
  type BusinessHours,
} from "@shared/businessHours";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const adminCtx = (): TrpcContext => ({
  admin: { adminId: 1, username: "admin", name: "Administrador" },
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

const publicCtx = (): TrpcContext => ({
  admin: null,
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

/** Todos os dias 08:00–18:00, para isolar o que cada teste exercita. */
const sempreAberto = (): BusinessHours =>
  Array.from({ length: 7 }, () => ({
    open: true,
    from: "08:00",
    to: "18:00",
  })) as BusinessHours;

describe("fuso horário da loja", () => {
  it("usa o horário de São Paulo, não o UTC do servidor", () => {
    // 25/08/2026 02:00 UTC = 24/08/2026 23:00 em São Paulo (UTC-3).
    // Dia e hora mudam: é justamente onde um cálculo em UTC erraria.
    const { weekday, minutes } = getStoreLocalTime(
      new Date("2026-08-25T02:00:00Z")
    );

    expect(weekday).toBe(1); // segunda (em UTC já seria terça)
    expect(minutes).toBe(23 * 60);
  });
});

describe("getStoreStatus", () => {
  it("está aberto dentro da faixa", () => {
    // 14:00 em São Paulo = 17:00 UTC
    const status = getStoreStatus(sempreAberto(), new Date("2026-08-25T17:00:00Z"));
    expect(status.isOpen).toBe(true);
  });

  it("abre exatamente no horário de abertura", () => {
    const status = getStoreStatus(sempreAberto(), new Date("2026-08-25T11:00:00Z"));
    expect(status.isOpen).toBe(true);
  });

  it("já está fechado no horário de fechamento", () => {
    // às 18:00 em ponto a loja não aceita mais pedidos
    const status = getStoreStatus(sempreAberto(), new Date("2026-08-25T21:00:00Z"));
    expect(status.isOpen).toBe(false);
  });

  it("está fechado antes de abrir", () => {
    const status = getStoreStatus(sempreAberto(), new Date("2026-08-25T10:00:00Z"));
    expect(status.isOpen).toBe(false);
    expect(status.nextOpening).toEqual({ weekday: 2, time: "08:00" });
  });

  it("respeita o dia desativado", () => {
    const hours = sempreAberto();
    hours[2] = { ...hours[2], open: false }; // terça fechada

    // terça, 14:00 em São Paulo
    const status = getStoreStatus(hours, new Date("2026-08-25T17:00:00Z"));
    expect(status.isOpen).toBe(false);
    expect(status.nextOpening).toEqual({ weekday: 3, time: "08:00" });
  });

  it("aponta a próxima abertura pulando os dias fechados", () => {
    const hours = sempreAberto();
    hours[3] = { ...hours[3], open: false };
    hours[4] = { ...hours[4], open: false };

    // terça 20:00 local: já fechou, e quarta/quinta não abrem
    const status = getStoreStatus(hours, new Date("2026-08-25T23:00:00Z"));
    expect(status.nextOpening).toEqual({ weekday: 5, time: "08:00" });
  });

  it("não aponta próxima abertura quando nenhum dia está ativo", () => {
    const fechado = sempreAberto().map(d => ({ ...d, open: false })) as BusinessHours;
    const status = getStoreStatus(fechado, new Date("2026-08-25T17:00:00Z"));

    expect(status.isOpen).toBe(false);
    expect(status.nextOpening).toBeUndefined();
  });
});

describe("validação", () => {
  it("recusa fechamento anterior ou igual à abertura", () => {
    expect(isValidDayHours({ open: true, from: "18:00", to: "08:00" })).toBe(false);
    expect(isValidDayHours({ open: true, from: "08:00", to: "08:00" })).toBe(false);
    expect(isValidDayHours({ open: true, from: "08:00", to: "18:00" })).toBe(true);
  });

  it("ignora horário inválido em dia desativado", () => {
    expect(isValidDayHours({ open: false, from: "99:99", to: "00:00" })).toBe(true);
  });

  it("converte HH:MM em minutos", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("cai no padrão quando o valor salvo está corrompido", () => {
    expect(normalizeBusinessHours(null)).toEqual(DEFAULT_BUSINESS_HOURS);
    expect(normalizeBusinessHours([{ open: true }])).toEqual(DEFAULT_BUSINESS_HOURS);
  });

  it("desativa o dia cuja faixa é inválida em vez de descartar tudo", () => {
    const bruto = sempreAberto().map(d => ({ ...d }));
    bruto[1] = { open: true, from: "20:00", to: "09:00" };

    expect(normalizeBusinessHours(bruto)[1].open).toBe(false);
  });
});

describe("rotas de horário", () => {
  it("exige sessão de admin para alterar", async () => {
    const caller = appRouter.createCaller(publicCtx());

    await expect(
      caller.settings.setBusinessHours({ hours: sempreAberto() })
    ).rejects.toThrow();
  });

  it("recusa faixa invertida", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const hours = sempreAberto();
    hours[1] = { open: true, from: "18:00", to: "08:00" };

    await expect(caller.settings.setBusinessHours({ hours })).rejects.toThrow(
      /depois do de abertura/
    );
  });

  it("salva e devolve o que foi salvo", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const hours = sempreAberto();
    hours[0] = { open: false, from: "08:00", to: "12:00" };
    hours[6] = { open: true, from: "07:30", to: "13:00" };

    await caller.settings.setBusinessHours({ hours });

    const { hours: salvo } = await caller.settings.getBusinessHours();
    expect(salvo[0].open).toBe(false);
    expect(salvo[6]).toEqual({ open: true, from: "07:30", to: "13:00" });
  });

  it("recusa pedido com a loja fechada", async () => {
    const admin = appRouter.createCaller(adminCtx());
    const cliente = appRouter.createCaller(publicCtx());

    // fecha todos os dias
    const fechado = sempreAberto().map(d => ({ ...d, open: false })) as BusinessHours;
    await admin.settings.setBusinessHours({ hours: fechado });

    const produtos = await cliente.products.available();

    await expect(
      cliente.orders.create({
        items: [{ productId: produtos[0].id, quantity: 1000 }],
        customerName: "Cliente Teste",
        customerPhone: "11999999999",
        deliveryStreet: "Rua de Teste",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro",
        paymentMethod: "pix",
      })
    ).rejects.toThrow(/fechada/);

    // reabre para não interferir nos outros testes
    await admin.settings.setBusinessHours({ hours: sempreAberto() });
  });
});
