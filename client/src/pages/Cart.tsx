import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { ArrowLeft, Trash2, ShoppingCart, User, Phone, MapPin, Truck, CreditCard, QrCode, Banknote } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import StoreStatusBanner from "@/components/StoreStatusBanner";

type CartItem = {
  productId: number;
  productName: string;
  pricePerKg: number;
  quantityGrams: number;
  cutTypeName?: string;
};

type PaymentMethod = "card" | "pix" | "cash";

export default function Cart() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  // Estados do formulário de checkout
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [changeFor, setChangeFor] = useState("");

  // Buscar taxa de entrega
  const { data: deliveryFee = 0 } = trpc.settings.getDeliveryFee.useQuery();

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success("Pedido realizado com sucesso!");
      setCart([]);
      localStorage.removeItem("cart");
      setLocation(`/order/confirmation/${data.orderId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar pedido: ${error.message}`);
    },
  });

  const removeFromCart = (productId: number, cutTypeName?: string) => {
    const newCart = cart.filter((item) => 
      !(item.productId === productId && item.cutTypeName === cutTypeName)
    );
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast.success("Item removido do carrinho");
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      return total + Math.round((item.pricePerKg * item.quantityGrams) / 1000);
    }, 0);
  };

  // Loja fechada bloqueia o checkout; o servidor recusa de qualquer forma,
  // mas avisar antes evita o cliente preencher tudo à toa.
  const { data: businessHours } = trpc.settings.getBusinessHours.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const isStoreOpen = businessHours?.status.isOpen ?? true;

  const handleCheckout = () => {
    if (!isStoreOpen) {
      toast.error("A loja está fechada no momento e não pode receber pedidos");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome");
      return;
    }

    if (!customerPhone.trim()) {
      toast.error("Por favor, informe seu telefone");
      return;
    }
    
    if (!deliveryAddress.trim()) {
      toast.error("Por favor, informe o endereço de entrega");
      return;
    }

    // Validar troco se pagamento em dinheiro
    let changeForValue: number | undefined;
    if (paymentMethod === "cash" && changeFor.trim()) {
      const changeAmount = parseFloat(changeFor.replace(",", ".")) * 100;
      if (isNaN(changeAmount) || changeAmount < total) {
        toast.error("O valor para troco deve ser maior ou igual ao total do pedido");
        return;
      }
      changeForValue = Math.round(changeAmount);
    }

    createOrderMutation.mutate({
      items: cart.map((item) => ({
        productId: item.productId,
        quantityGrams: item.quantityGrams,
        cutTypeName: item.cutTypeName || "Não especificado",
      })),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      notes: notes.trim() || undefined,
      paymentMethod,
      changeFor: changeForValue,
    });
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        <div className="container py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o Catálogo
            </Button>
          </Link>

          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <CardTitle>Carrinho Vazio</CardTitle>
              <CardDescription>
                Adicione produtos ao carrinho para fazer seu pedido
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/">
                <Button>Ver Produtos</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <div className="container py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Catálogo
          </Button>
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Carrinho */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Seu Carrinho
                </CardTitle>
                <CardDescription>{cart.length} item(ns) no carrinho</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Layout de Cards para Mobile */}
                <div className="space-y-4">
                  {cart.map((item, index) => {
                    const itemSubtotal = Math.round((item.pricePerKg * item.quantityGrams) / 1000);
                    return (
                      <div key={`${item.productId}-${item.cutTypeName}-${index}`} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{item.productName}</h3>
                            {item.cutTypeName && (
                              <p className="text-sm font-medium text-primary mt-1">
                                Corte: {item.cutTypeName}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              R$ {(item.pricePerKg / 100).toFixed(2)}/kg
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.productId, item.cutTypeName)}
                            className="-mt-2 -mr-2"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Quantidade</p>
                            <p className="text-base font-semibold">
                              {(item.quantityGrams / 1000).toFixed(1)} kg
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Subtotal</p>
                            <p className="text-lg font-bold text-red-600">
                              R$ {(itemSubtotal / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Resumo de valores */}
                <div className="mt-6 border-t pt-4 space-y-2">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-muted-foreground">Subtotal dos produtos:</span>
                    <span className="font-medium">R$ {(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Taxa de entrega:
                    </span>
                    <span className="font-medium">
                      {deliveryFee > 0 ? `R$ ${(deliveryFee / 100).toFixed(2)}` : "Grátis"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-2xl text-red-600">R$ {(total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário de Checkout */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Finalizar Pedido</CardTitle>
                <CardDescription>Preencha seus dados para entrega</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Seu Nome *
                  </Label>
                  <Input
                    id="customerName"
                    placeholder="Digite seu nome completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-base"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone/WhatsApp *
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="text-base"
                  />
                </div>

                {/* Endereço */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço de Entrega *
                  </Label>
                  <Textarea
                    id="deliveryAddress"
                    placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                    className="text-base resize-none"
                  />
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Forma de Pagamento *
                  </Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="pix" id="pix" />
                      <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
                        <QrCode className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">PIX</p>
                          <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Cartão</p>
                          <p className="text-xs text-muted-foreground">Crédito ou débito na entrega</p>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Banknote className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">Dinheiro</p>
                          <p className="text-xs text-muted-foreground">Pagamento em espécie na entrega</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Campo de Troco (apenas para dinheiro) */}
                {paymentMethod === "cash" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="changeFor" className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Troco para quanto? (opcional)
                    </Label>
                    <Input
                      id="changeFor"
                      type="text"
                      placeholder={`Ex: ${((total / 100) + 10).toFixed(2)}`}
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco se tiver o valor exato (R$ {(total / 100).toFixed(2)})
                    </p>
                  </div>
                )}

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Alguma observação sobre seu pedido?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-base resize-none"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                {!isStoreOpen && <StoreStatusBanner className="w-full" />}
                <Button
                  className="w-full text-lg py-6"
                  onClick={handleCheckout}
                  disabled={createOrderMutation.isPending || !isStoreOpen}
                >
                  {createOrderMutation.isPending
                    ? "Processando..."
                    : !isStoreOpen
                      ? "Loja fechada"
                      : `Finalizar Pedido - R$ ${(total / 100).toFixed(2)}`}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
