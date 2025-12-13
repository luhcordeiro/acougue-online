import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Home, Share2, MapPin, Calendar, User, Phone } from "lucide-react";
import { APP_TITLE } from "@/const";

export default function OrderConfirmation() {
  const [, params] = useRoute("/order/confirmation/:id");
  const [, setLocation] = useLocation();
  const orderId = params?.id ? parseInt(params.id) : null;

  const { data: orderData, isLoading } = trpc.orders.getById.useQuery(
    { id: orderId! },
    { enabled: !!orderId }
  );

  const order = orderData?.order;
  const items = orderData?.items || [];

  useEffect(() => {
    if (!orderId) {
      setLocation("/");
    }
  }, [orderId, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando informações do pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Pedido não encontrado.
            </p>
            <Link href="/">
              <Button className="w-full mt-4">
                <Home className="mr-2 h-4 w-4" />
                Voltar para a loja
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleShareWhatsApp = () => {
    const itemsText = items
      .map((item) => `• ${item.productName} - ${item.cutTypeName || 'Sem corte'} - ${(item.quantityGrams / 1000).toFixed(1)}kg - R$ ${(item.subtotal / 100).toFixed(2)}`)
      .join("\n");

    const message = `🥩 *Pedido #${order.id} - ${APP_TITLE}*\n\n` +
      `📦 *Itens do Pedido:*\n${itemsText}\n\n` +
      `💰 *Total: R$ ${(order.totalAmount / 100).toFixed(2)}*\n\n` +
      `👤 *Cliente:* ${order.customerName}\n` +
      `📱 *Telefone:* ${order.customerPhone}\n` +
      `📍 *Endereço:* ${order.deliveryAddress}\n` +
      `📅 *Entrega:* ${new Date(order.deliveryDate!).toLocaleString("pt-BR")}\n\n` +
      (order.notes ? `📝 *Observações:* ${order.notes}\n\n` : "") +
      `✅ Pedido confirmado com sucesso!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background">
      <div className="container py-8 max-w-3xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-700 mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">
            Seu pedido foi recebido com sucesso e está sendo processado.
          </p>
        </div>

        {/* Order Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pedido #{order.id}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {new Date(order.createdAt).toLocaleString("pt-BR")}
              </span>
            </CardTitle>
            <CardDescription>
              Resumo do seu pedido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                Informações do Cliente
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                Informações de Entrega
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{order.deliveryAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {new Date(order.deliveryDate!).toLocaleString("pt-BR", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                Itens do Pedido
              </h3>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      {item.cutTypeName && (
                        <p className="text-sm text-muted-foreground">
                          Corte: {item.cutTypeName}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Quantidade: {(item.quantityGrams / 1000).toFixed(1)} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        R$ {(item.subtotal / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Observações
                </h3>
                <p className="text-sm p-3 bg-muted/50 rounded-lg">{order.notes}</p>
              </div>
            )}

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {(order.totalAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Button
            size="lg"
            variant="outline"
            onClick={handleShareWhatsApp}
            className="w-full"
          >
            <Share2 className="mr-2 h-5 w-5" />
            Compartilhar no WhatsApp
          </Button>
          <Link href="/">
            <Button size="lg" className="w-full">
              <Home className="mr-2 h-5 w-5" />
              Voltar para a loja
            </Button>
          </Link>
        </div>

        {/* Info Box */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm text-blue-900">
              <strong>Importante:</strong> Você receberá atualizações sobre o status do seu pedido. 
              Em caso de dúvidas, entre em contato conosco através do WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
