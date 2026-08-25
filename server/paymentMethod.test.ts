import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Payment Method', () => {
  it('should create order with PIX payment method', async () => {
    const caller = appRouter.createCaller({
      admin: null,
      secure: true,
      pendingCookies: [],
      setCookie: () => {},
    });

    // Get available products
    const products = await db.getAvailableProducts();
    expect(products.length).toBeGreaterThan(0);
    const testProduct = products[0];

    // Create order with PIX payment
    const result = await caller.orders.create({
      items: [{
        productId: testProduct.id,
        quantity: 1000,
        cutTypeName: 'Moído',
      }],
      customerName: 'Cliente Teste PIX',
      customerPhone: '11999999999',
      deliveryStreet: 'Rua Teste',
      deliveryNumber: '123',
      deliveryNeighborhood: 'Centro',
      paymentMethod: 'pix',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();

    // Verify order was created with correct payment method
    const order = await db.getOrderById(result.orderId);
    expect(order?.paymentMethod).toBe('pix');
    expect(order?.changeFor).toBeNull();
  });

  it('should create order with card payment method', async () => {
    const caller = appRouter.createCaller({
      admin: null,
      secure: true,
      pendingCookies: [],
      setCookie: () => {},
    });

    // Get available products
    const products = await db.getAvailableProducts();
    expect(products.length).toBeGreaterThan(0);
    const testProduct = products[0];

    // Create order with card payment
    const result = await caller.orders.create({
      items: [{
        productId: testProduct.id,
        quantity: 1500,
        cutTypeName: 'Bife',
      }],
      customerName: 'Cliente Teste Cartão',
      customerPhone: '11988888888',
      deliveryStreet: 'Rua Cartao',
      deliveryNumber: '456',
      deliveryNeighborhood: 'Centro',
      paymentMethod: 'card',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();

    // Verify order was created with correct payment method
    const order = await db.getOrderById(result.orderId);
    expect(order?.paymentMethod).toBe('card');
    expect(order?.changeFor).toBeNull();
  });

  it('should create order with cash payment and change', async () => {
    const caller = appRouter.createCaller({
      admin: null,
      secure: true,
      pendingCookies: [],
      setCookie: () => {},
    });

    // Get available products
    const products = await db.getAvailableProducts();
    expect(products.length).toBeGreaterThan(0);
    const testProduct = products[0];

    // Create order with cash payment and change
    const result = await caller.orders.create({
      items: [{
        productId: testProduct.id,
        quantity: 2000,
        cutTypeName: 'Em Cubos',
      }],
      customerName: 'Cliente Teste Dinheiro',
      customerPhone: '11977777777',
      deliveryStreet: 'Rua Dinheiro',
      deliveryNumber: '789',
      deliveryNeighborhood: 'Centro',
      paymentMethod: 'cash',
      changeFor: 10000, // R$ 100,00 em centavos
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();

    // Verify order was created with correct payment method and change
    const order = await db.getOrderById(result.orderId);
    expect(order?.paymentMethod).toBe('cash');
    expect(order?.changeFor).toBe(10000);
  });

  it('should create order with cash payment without change', async () => {
    const caller = appRouter.createCaller({
      admin: null,
      secure: true,
      pendingCookies: [],
      setCookie: () => {},
    });

    // Get available products
    const products = await db.getAvailableProducts();
    expect(products.length).toBeGreaterThan(0);
    const testProduct = products[0];

    // Create order with cash payment without change
    const result = await caller.orders.create({
      items: [{
        productId: testProduct.id,
        quantity: 1000,
        cutTypeName: 'Inteiro',
      }],
      customerName: 'Cliente Teste Sem Troco',
      customerPhone: '11966666666',
      deliveryStreet: 'Rua Sem Troco',
      deliveryNumber: '101',
      deliveryNeighborhood: 'Centro',
      paymentMethod: 'cash',
    });

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();

    // Verify order was created with correct payment method and no change
    const order = await db.getOrderById(result.orderId);
    expect(order?.paymentMethod).toBe('cash');
    expect(order?.changeFor).toBeNull();
  });
});
