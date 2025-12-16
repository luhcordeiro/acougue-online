import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
// Select removido - usando botões para tipo de corte
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";


export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const productId = params?.id ? parseInt(params.id) : 0;
  const [quantity, setQuantity] = useState("1.0");
  const [selectedCutType, setSelectedCutType] = useState<string>("");
  

  const { data: product, isLoading } = trpc.products.getById.useQuery({ id: productId });
  // Buscar tipos de corte específicos do produto
  const { data: productCutTypes = [] } = trpc.cutTypes.getByProduct.useQuery(
    { productId },
    { enabled: productId > 0 }
  );
  // Fallback para todos os tipos de corte se o produto não tiver nenhum associado
  const { data: allCutTypes = [] } = trpc.cutTypes.list.useQuery();
  
  // Usar tipos de corte do produto se houver, senão usar todos
  const cutTypes = productCutTypes.length > 0 ? productCutTypes : allCutTypes;

  // Buscar quantidades rápidas específicas do produto
  const { data: productQuickQuantities = [] } = trpc.quickQuantities.getByProduct.useQuery(
    { productId },
    { enabled: productId > 0 }
  );
  // Fallback para todas as quantidades rápidas se o produto não tiver nenhuma associada
  const { data: allQuickQuantities = [] } = trpc.quickQuantities.list.useQuery();
  
  // Usar quantidades do produto se houver, senão usar todas
  const quickQuantities = productQuickQuantities.length > 0 ? productQuickQuantities : allQuickQuantities;

  // Quantidades pré-definidas padrão (fallback se não houver nenhuma cadastrada)
  const defaultQuantities = [500, 1000, 1500, 2000]; // em gramas

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
    
    // Disparar evento para atualizar o carrinho flutuante
    window.dispatchEvent(new Event("storage"));
    
    toast.success(`${quantityNum} kg de ${product?.name} (${selectedCutType}) adicionado ao carrinho!`);
    
    // Voltar para o catálogo após adicionar
    setTimeout(() => {
      setLocation("/");
    }, 500);
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
                {/* Seleção de Tipo de Corte - Botões */}
                <div className="space-y-2">
                  <Label>Tipo de Corte *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {cutTypes.length === 0 ? (
                      <p className="text-muted-foreground col-span-2 text-center py-2">
                        Nenhum tipo de corte disponível
                      </p>
                    ) : (
                      cutTypes.map((cutType) => (
                        <Button
                          key={cutType.id}
                          type="button"
                          variant={selectedCutType === cutType.name ? "default" : "outline"}
                          onClick={() => setSelectedCutType(cutType.name)}
                          className="h-12 text-base font-semibold"
                        >
                          {cutType.name}
                        </Button>
                      ))
                    )}
                  </div>
                </div>

                {/* Botões de Quantidades Rápidas */}
                <div className="space-y-2">
                  <Label>Quantidades Rápidas</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {quickQuantities.length > 0 ? (
                      quickQuantities.map((qq) => (
                        <Button
                          key={qq.id}
                          type="button"
                          variant={parseFloat(quantity) === qq.valueGrams / 1000 ? "default" : "outline"}
                          onClick={() => setQuantity((qq.valueGrams / 1000).toFixed(1))}
                          className="h-12 text-base font-semibold"
                        >
                          {qq.label}
                        </Button>
                      ))
                    ) : (
                      defaultQuantities.map((grams) => (
                        <Button
                          key={grams}
                          type="button"
                          variant={parseFloat(quantity) === grams / 1000 ? "default" : "outline"}
                          onClick={() => setQuantity((grams / 1000).toFixed(1))}
                          className="h-12 text-base font-semibold"
                        >
                          {(grams / 1000).toFixed(1)}kg
                        </Button>
                      ))
                    )}
                  </div>
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
