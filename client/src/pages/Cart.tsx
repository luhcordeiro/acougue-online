import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trash2, ShoppingCart, MapPin, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

type CartItem = {
  productId: number;
  productName: string;
  pricePerKg: number;
  quantityGrams: number;
};

export default function Cart() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  // Estados do formulário de entrega
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido realizado com sucesso!");
      setCart([]);
      localStorage.removeItem("cart");
      setLocation("/my-orders");
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
      deliveryAddress: deliveryAddress.trim(),
      deliveryDate: selectedDate.toISOString(),
      notes: notes.trim() || undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Login Necessário</CardTitle>
            <CardDescription>Você precisa estar logado para acessar o carrinho</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Fazer Login</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const totalAmount = calculateTotal();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Carrinho de Compras</h1>
            <p className="text-muted-foreground">Revise seus itens e finalize o pedido</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">Seu carrinho está vazio</p>
              <p className="text-muted-foreground mb-6">Adicione produtos para continuar</p>
              <Link href="/">
                <Button>Ver Produtos</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Itens do Pedido</CardTitle>
                  <CardDescription>{cart.length} item(ns) no carrinho</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Preço/Kg</TableHead>
                        <TableHead>Quantidade (kg)</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>R$ {(item.pricePerKg / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={(item.quantityGrams / 1000).toFixed(2)}
                              onChange={(e) => {
                                const kg = parseFloat(e.target.value);
                                if (!isNaN(kg) && kg > 0) {
                                  updateQuantity(item.productId, Math.round(kg * 1000));
                                }
                              }}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell className="font-bold">
                            R$ {(Math.round((item.pricePerKg * item.quantityGrams) / 1000) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Informações de Entrega
                  </CardTitle>
                  <CardDescription>Informe o endereço e data para entrega</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryAddress">Endereço Completo de Entrega *</Label>
                    <Textarea
                      id="deliveryAddress"
                      placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Exemplo: Rua das Flores, 123, Apto 45, Centro, São Paulo/SP, CEP: 01234-567
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data e Hora de Entrega *
                    </Label>
                    <Input
                      id="deliveryDate"
                      type="datetime-local"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Selecione quando deseja receber seu pedido
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Alguma observação sobre o pedido?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal:</span>
                    <span>R$ {(totalAmount / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold border-t pt-4">
                    <span>Total:</span>
                    <span className="text-primary">R$ {(totalAmount / 100).toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={createOrderMutation.isPending || cart.length === 0}
                  >
                    {createOrderMutation.isPending ? "Processando..." : "Finalizar Pedido"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
