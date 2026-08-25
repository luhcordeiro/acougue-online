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
        quantityGrams: 1000, // 1kg
        cutTypeName: 'Moído',
      }],
      customerName: 'João Silva Teste',
      customerPhone: '(11) 98765-4321',
      deliveryAddress: 'Rua das Flores, 123, Apto 45, Centro, São Paulo - SP, CEP 01234-567',
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
    expect(items[0].quantityGrams).toBe(1000);
    expect(items[0].cutTypeName).toBe('Moído');
  });
});
