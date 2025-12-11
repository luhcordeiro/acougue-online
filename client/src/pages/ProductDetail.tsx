import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";


export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id ? parseInt(params.id) : 0;
  const [quantity, setQuantity] = useState("1.0");
  const [selectedCutType, setSelectedCutType] = useState<string>("");
  

  const { data: product, isLoading } = trpc.products.getById.useQuery({ id: productId });
  const { data: cutTypes = [] } = trpc.cutTypes.list.useQuery();

  // Quantidades pré-definidas
  const predefinedQuantities = [0.5, 1.0, 1.5, 2.0];

  const subtotal = product ? (product.pricePerKg / 100) * parseFloat(quantity || "0") : 0;

  const handleAddToCart = () => {
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Quantidade inválida");
      return;
    }

    if (!selectedCutType) {
      toast.error("Por favor, selecione o tipo de corte");
      return;
    }

    // Adicionar ao carrinho (localStorage)
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    
    // Verificar se já existe item com mesmo produto E mesmo corte
    const existingItemIndex = cart.findIndex((item: any) => 
      item.productId === productId && item.cutTypeName === selectedCutType
    );
    
    if (existingItemIndex >= 0) {
      // Atualizar quantidade do item existente
      cart[existingItemIndex].quantityGrams = Math.round(quantityNum * 1000);
    } else {
      // Adicionar novo item
      cart.push({
        productId,
        productName: product?.name,
        pricePerKg: product?.pricePerKg,
        quantityGrams: Math.round(quantityNum * 1000),
        imageUrl: product?.imageUrl,
        cutTypeName: selectedCutType,
      });
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    toast.success(`${quantityNum} kg de ${product?.name} (${selectedCutType}) adicionado ao carrinho!`);
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
      <div className="container py-4 sm:py-8">
        <Link href="/">
          <Button variant="outline" className="mb-4 sm:mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>
        </Link>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
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
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">{product.name}</h1>
              {product.description && (
                <p className="text-muted-foreground text-base sm:text-lg">{product.description}</p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl sm:text-3xl text-primary">
                  R$ {(product.pricePerKg / 100).toFixed(2)}/kg
                </CardTitle>
                <CardDescription>
                  Estoque disponível: {(product.stockKg / 1000).toFixed(1)} kg
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Seleção de Tipo de Corte */}
                <div className="space-y-2">
                  <Label htmlFor="cutType">Tipo de Corte *</Label>
                  <Select value={selectedCutType} onValueChange={setSelectedCutType}>
                    <SelectTrigger id="cutType" className="text-base sm:text-lg h-12">
                      <SelectValue placeholder="Selecione o tipo de corte" />
                    </SelectTrigger>
                    <SelectContent>
                      {cutTypes.map((cutType) => (
                        <SelectItem key={cutType.id} value={cutType.name} className="text-base">
                          {cutType.name}
                          {cutType.description && (
                            <span className="text-sm text-muted-foreground ml-2">
                              - {cutType.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botões de Quantidades Pré-definidas */}
                <div className="space-y-2">
                  <Label>Quantidades Rápidas</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {predefinedQuantities.map((qty) => (
                      <Button
                        key={qty}
                        type="button"
                        variant={parseFloat(quantity) === qty ? "default" : "outline"}
                        onClick={() => setQuantity(qty.toFixed(1))}
                        className="h-12 text-base font-semibold"
                      >
                        {qty.toFixed(1)}kg
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Campo de Quantidade Manual */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Ou digite a quantidade (kg)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max={(product.stockKg / 1000).toString()}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-base sm:text-lg h-12"
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-medium">Subtotal:</span>
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      R$ {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 sm:h-14 text-base sm:text-lg" 
                  onClick={handleAddToCart}
                  disabled={!selectedCutType}
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
