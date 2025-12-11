import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trash2, ShoppingCart, User, Phone, MapPin, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type CartItem = {
  productId: number;
  productName: string;
  pricePerKg: number;
  quantityGrams: number;
};

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
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido realizado com sucesso! Entraremos em contato em breve.");
      setCart([]);
      localStorage.removeItem("cart");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(`Erro ao criar pedido: ${error.message}`);
    },
  });

  const removeFromCart = (productId: number) => {
    const newCart = cart.filter((item) => item.productId !== productId);
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    toast.success("Item removido do carrinho");
  };

  const updateQuantity = (productId: number, newQuantityGrams: number) => {
    if (newQuantityGrams <= 0) {
      removeFromCart(productId);
      return;
    }

    const newCart = cart.map((item) =>
      item.productId === productId ? { ...item, quantityGrams: newQuantityGrams } : item
    );
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + Math.round((item.pricePerKg * item.quantityGrams) / 1000);
    }, 0);
  };

  const handleCheckout = () => {
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

    if (!deliveryDate) {
      toast.error("Por favor, selecione a data e hora de entrega");
      return;
    }

    const selectedDate = new Date(deliveryDate);
    const now = new Date();
    if (selectedDate <= now) {
      toast.error("A data de entrega deve ser futura");
      return;
    }

    createOrderMutation.mutate({
      items: cart.map((item) => ({
        productId: item.productId,
        quantityGrams: item.quantityGrams,
      })),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryDate: selectedDate.toISOString(),
      notes: notes.trim() || undefined,
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

  const total = calculateTotal();
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 2);
  const minDateString = minDate.toISOString().slice(0, 16);

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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Preço/kg</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => {
                      const subtotal = Math.round((item.pricePerKg * item.quantityGrams) / 1000);
                      return (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={(item.quantityGrams / 1000).toFixed(1)}
                              onChange={(e) => {
                                const kg = parseFloat(e.target.value);
                                if (!isNaN(kg) && kg > 0) {
                                  updateQuantity(item.productId, Math.round(kg * 1000));
                                }
                              }}
                              className="w-20 mx-auto text-center"
                            />
                            <span className="text-xs text-muted-foreground ml-1">kg</span>
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {(item.pricePerKg / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {(subtotal / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="mt-6 flex justify-between items-center text-lg font-bold border-t pt-4">
                  <span>Total:</span>
                  <span className="text-2xl text-red-600">R$ {(total / 100).toFixed(2)}</span>
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

                {/* Data e Hora */}
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data e Hora de Entrega *
                  </Label>
                  <Input
                    id="deliveryDate"
                    type="datetime-local"
                    min={minDateString}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="text-base"
                  />
                </div>

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
              <CardFooter>
                <Button
                  className="w-full text-lg py-6"
                  onClick={handleCheckout}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? "Processando..." : `Finalizar Pedido - R$ ${(total / 100).toFixed(2)}`}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
