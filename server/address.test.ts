import { formatAddress } from "@shared/address";
import { buildReceipt } from "@shared/receipt";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const publicCtx = (): TrpcContext => ({
  admin: null,
  secure: true,
  pendingCookies: [],
  setCookie: () => {},
});

const cliente = () => appRouter.createCaller(publicCtx());

async function pedidoCom(endereco: {
  deliveryStreet: string;
  deliveryNumber: string;
  deliveryNeighborhood: string;
}) {
  const caller = cliente();
  const produtos = await caller.products.available();
  const produto = produtos.find(p => p.unit === "kg")!;

  return caller.orders.create({
    items: [{ productId: produto.id, quantity: 1000 }],
    customerName: "Cliente Teste",
    customerPhone: "18991363710",
    paymentMethod: "pix",
    ...endereco,
  });
}

const enderecoValido = {
  deliveryStreet: "Rua das Flores",
  deliveryNumber: "123",
  deliveryNeighborhood: "Centro",
};

describe("formatAddress", () => {
  it("monta o endereço legível", () => {
    expect(formatAddress(enderecoValido)).toBe("Rua das Flores, 123 - Centro");
  });

  it("descarta espaços sobrando do que o cliente digitou", () => {
    expect(
      formatAddress({
        deliveryStreet: "  Rua das Flores  ",
        deliveryNumber: " 123 ",
        deliveryNeighborhood: " Centro ",
      })
    ).toBe("Rua das Flores, 123 - Centro");
  });
});

describe("endereço no checkout", () => {
  it("grava as partes e o endereço montado", async () => {
    const { orderId } = await pedidoCom(enderecoValido);
    const { order } = await cliente().orders.getById({ id: orderId });

    expect(order.deliveryStreet).toBe("Rua das Flores");
    expect(order.deliveryNumber).toBe("123");
    expect(order.deliveryNeighborhood).toBe("Centro");
    // o campo montado continua servindo painel, cupom e pedidos antigos
    expect(order.deliveryAddress).toBe("Rua das Flores, 123 - Centro");
  });

  it("exige o endereço", async () => {
    await expect(
      pedidoCom({ ...enderecoValido, deliveryStreet: "" })
    ).rejects.toThrow(/Informe o endereço/);
  });

  it("exige o número", async () => {
    // é o campo mais esquecido num endereço em linha única
    await expect(
      pedidoCom({ ...enderecoValido, deliveryNumber: "" })
    ).rejects.toThrow(/Informe o número/);
  });

  it("exige o bairro", async () => {
    await expect(
      pedidoCom({ ...enderecoValido, deliveryNeighborhood: "" })
    ).rejects.toThrow(/Informe o bairro/);
  });

  it("aceita S/N como número", async () => {
    const { orderId } = await pedidoCom({ ...enderecoValido, deliveryNumber: "S/N" });
    const { order } = await cliente().orders.getById({ id: orderId });

    expect(order.deliveryAddress).toBe("Rua das Flores, S/N - Centro");
  });

  it("recusa endereço formado só por espaços", async () => {
    await expect(
      pedidoCom({ ...enderecoValido, deliveryStreet: "     " })
    ).rejects.toThrow();
  });
});

describe("endereço no cupom", () => {
  const base = {
    id: 1,
    createdAt: new Date("2026-08-25T15:00:00"),
    customerName: "Maria Silva",
    customerPhone: "18991363710",
    paymentMethod: "pix" as const,
    totalAmount: 5000,
  };

  const itens = [
    {
      productName: "Acem",
      quantity: 1000,
      unit: "kg" as const,
      price: 5000,
      subtotal: 5000,
    },
  ];

  it("dá linha própria ao bairro, que guia a rota do entregador", () => {
    const cupom = buildReceipt(
      {
        ...base,
        deliveryAddress: "Rua das Flores, 123 - Centro",
        deliveryStreet: "Rua das Flores",
        deliveryNumber: "123",
        deliveryNeighborhood: "Centro",
      },
      itens
    );

    expect(cupom).toContain("Rua das Flores, 123");
    expect(cupom).toContain("BAIRRO: CENTRO");
  });

  it("usa o endereço montado nos pedidos antigos, sem as partes", () => {
    const cupom = buildReceipt(
      { ...base, deliveryAddress: "Rua Antiga, 500, Bairro Velho" },
      itens
    );

    expect(cupom).toContain("Rua Antiga, 500, Bairro Velho");
    expect(cupom).not.toContain("BAIRRO:");
  });
});
