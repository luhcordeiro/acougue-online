import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trash2, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

interface CartItem {
  productId: number;
  productName: string;
  pricePerKg: number;
  quantityKg: number;
  imageUrl?: string;
}

export default function Cart() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const utils = trpc.useUtils();
  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Pedido #${data.orderId} criado com sucesso!`);
      localStorage.removeItem("cart");
      setCart([]);
      setNotes("");
      setLocation("/my-orders");
    },
    onError: (error) => {
      toast.error(`Erro ao criar pedido: ${error.message}`);
    },
  });

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const removeItem = (productId: number) => {
    const newCart = cart.filter(item => item.productId !== productId);
    updateCart(newCart);
    toast.success("Item removido do carrinho");
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    
    const newCart = cart.map(item =>
      item.productId === productId
        ? { ...item, quantityKg: newQuantity }
        : item
    );
    updateCart(newCart);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      return total + (item.pricePerKg / 100) * item.quantityKg;
    }, 0);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error("Você precisa fazer login para finalizar o pedido");
      return;
    }

    if (cart.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    const items = cart.map(item => ({
      productId: item.productId,
      quantityGrams: Math.round(item.quantityKg * 1000), // Converter kg para gramas
    }));

    createOrderMutation.mutate({
      items,
      notes: notes || undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <ShoppingCart className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Faça login para acessar o carrinho</h2>
        <a href={getLoginUrl()}>
          <Button size="lg">Fazer Login</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Link href="/">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continuar Comprando
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-6">Carrinho de Compras</h1>

        {cart.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground mb-4">Seu carrinho está vazio</p>
                <Link href="/">
                  <Button>Começar a Comprar</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lista de Itens */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Itens do Carrinho</CardTitle>
                  <CardDescription>{cart.length} item(ns)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Preço/Kg</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => {
                        const subtotal = (item.pricePerKg / 100) * item.quantityKg;
                        return (
                          <TableRow key={item.productId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.productName} 
                                    className="h-12 w-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-muted rounded" />
                                )}
                                <span className="font-medium">{item.productName}</span>
                              </div>
                            </TableCell>
                            <TableCell>R$ {(item.pricePerKg / 100).toFixed(2)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={item.quantityKg}
                                onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value))}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell className="font-medium">R$ {subtotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(item.productId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Resumo e Checkout */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma observação sobre o pedido?"
                      rows={3}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">R$ {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={createOrderMutation.isPending}
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
