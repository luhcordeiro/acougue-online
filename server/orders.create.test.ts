import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Orders - Create Order', () => {
  it('should create an order successfully', async () => {
    const caller = appRouter.createCaller({
      admin: null,
      secure: true,
      pendingCookies: [],
      setCookie: () => {},
    });

    // Verificar se há produtos disponíveis
    const products = await db.getAvailableProducts();
    expect(products.length).toBeGreaterThan(0);

    const testProduct = products[0];

    const result = await caller.orders.create({
      items: [{
        productId: testProduct.id,
        quantity: 1000, // 1kg
        cutTypeName: 'Moído',
      }],
      customerName: 'João Silva Teste',
      customerPhone: '(11) 98765-4321',
      deliveryStreet: 'Rua das Flores',
      deliveryNumber: '123',
      deliveryNeighborhood: 'Centro',
      notes: 'Teste de criação de pedido',
      paymentMethod: 'pix',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeGreaterThan(0);

    // Verificar se o pedido foi criado
    const order = await db.getOrderById(result.orderId);
    expect(order).toBeDefined();
    expect(order?.customerName).toBe('João Silva Teste');
    expect(order?.customerPhone).toBe('(11) 98765-4321');

    // Verificar se os itens foram criados
    const items = await db.getOrderItems(result.orderId);
    expect(items.length).toBe(1);
    expect(items[0].productId).toBe(testProduct.id);
    expect(items[0].quantity).toBe(1000);
    expect(items[0].cutTypeName).toBe('Moído');
  });
});

describe('Pedido grande', () => {
  it('aceita um pedido com muitos itens', async () => {
    const caller = appRouter.createCaller({
      admin: null,
      secure: true,
      pendingCookies: [],
      setCookie: () => {},
    });

    const produtos = await db.getAvailableProducts();
    expect(produtos.length).toBeGreaterThan(0);

    // o pedido real que quebrou tinha 18 itens; o catalogo de teste e menor,
    // entao repetimos produtos - o que importa aqui e a quantidade de itens
    const escolhidos = Array.from(
      { length: 18 },
      (_, i) => produtos[i % produtos.length]
    );

    const result = await caller.orders.create({
      items: escolhidos.map(p => ({
        productId: p.id,
        quantity: p.unit === 'un' ? 1 : 1000,
        cutTypeName: p.unit === 'un' ? undefined : 'Moído',
      })),
      customerName: 'Jose Compra Muito',
      customerPhone: '(18) 99999-1234',
      deliveryStreet: 'Rua Campo Salles',
      deliveryNumber: '529',
      deliveryNeighborhood: 'Industrial 2',
      paymentMethod: 'card',
    });

    expect(result.success).toBe(true);

    const itens = await db.getOrderItems(result.orderId);
    expect(itens.length).toBe(18);
  });

  it.each([13, 25, 60, 120])('aceita pedido com %i itens', async (quantos) => {
    const caller = appRouter.createCaller({
      admin: null,
      secure: true,
      pendingCookies: [],
      setCookie: () => {},
    });

    const produtos = await db.getAvailableProducts();

    const result = await caller.orders.create({
      items: Array.from({ length: quantos }, (_, i) => ({
        productId: produtos[i % produtos.length].id,
        quantity: 1000,
        cutTypeName: 'Moído',
      })),
      customerName: 'Pedido Grande',
      customerPhone: '(18) 99999-1234',
      deliveryStreet: 'Rua X',
      deliveryNumber: '1',
      deliveryNeighborhood: 'Centro',
      paymentMethod: 'pix',
    });

    expect(result.success).toBe(true);
    const itens = await db.getOrderItems(result.orderId);
    expect(itens.length).toBe(quantos);
  });

  it('não deixa pedido sem itens quando a gravação falha', async () => {
    const antes = await db.countOrders({});

    // productId inexistente: a chave estrangeira derruba a inserção dos itens
    // depois de o pedido já estar gravado - o cenário que gerou o pedido
    // fantasma de R$ 0,00 em produção
    await expect(
      db.createOrderWithItems(
        {
          customerName: 'Deve Sumir',
          customerPhone: '(18) 99999-0000',
          deliveryAddress: 'Rua X, 1 - Centro',
          paymentMethod: 'pix',
          totalAmount: 1000,
        } as any,
        [{ productId: 999999, productName: 'Fantasma', price: 100, unit: 'kg', quantity: 1000, subtotal: 100 } as any]
      )
      // a falha tem de ser na gravação dos ITENS: se fosse antes, o pedido nem
      // teria sido criado e o teste passaria sem exercitar o desfazimento
    ).rejects.toThrow(/insert into "orderItems"/);

    // o pedido gravado tem de ter sumido junto com a falha
    expect(await db.countOrders({})).toBe(antes);
  });
});
