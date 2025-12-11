import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";


export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id ? parseInt(params.id) : 0;
  const [quantity, setQuantity] = useState("1.0");
  

  const { data: product, isLoading } = trpc.products.getById.useQuery({ id: productId });

  const subtotal = product ? (product.pricePerKg / 100) * parseFloat(quantity || "0") : 0;

  const handleAddToCart = () => {
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    // Adicionar ao carrinho (localStorage)
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((item: any) => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantityKg = quantityNum;
    } else {
      cart.push({
        productId,
        productName: product?.name,
        pricePerKg: product?.pricePerKg,
        quantityKg: quantityNum,
        imageUrl: product?.imageUrl,
      });
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    toast.success(`${quantityNum} kg de ${product?.name} adicionado ao carrinho!`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Produto não encontrado</p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Link href="/">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Imagem do Produto */}
          <div className="aspect-square overflow-hidden rounded-lg bg-muted">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Sem imagem disponível
              </div>
            )}
          </div>

          {/* Informações e Compra */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              {product.description && (
                <p className="text-muted-foreground text-lg">{product.description}</p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-3xl text-primary">
                  R$ {(product.pricePerKg / 100).toFixed(2)}/kg
                </CardTitle>
                <CardDescription>
                  Estoque disponível: {(product.stockKg / 1000).toFixed(1)} kg
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="quantity">Quantidade (kg)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max={(product.stockKg / 1000).toString()}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Subtotal:</span>
                    <span className="text-2xl font-bold text-primary">
                      R$ {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
