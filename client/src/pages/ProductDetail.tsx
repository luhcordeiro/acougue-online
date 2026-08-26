import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
// Select removido - usando botões para tipo de corte
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import {
  calcSubtotal,
  DEFAULT_QUICK_QUANTITIES,
  formatPrice,
  formatQuantity,
  maxQuantity,
  minQuantity,
  parseKgInput,
  type SaleUnit,
} from "@shared/quantity";
import { readCart, writeCart } from "@/lib/cart";


export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const productId = params?.id ? parseInt(params.id) : 0;
  const [quantity, setQuantity] = useState("1");
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

  // Fallback quando nada foi cadastrado. Mesmo conjunto que o servidor aceita.
  const defaultQuantities = DEFAULT_QUICK_QUANTITIES;

  /** Pesos que o cliente pode escolher, na mesma ordem exibida. */
  const quantidadesPermitidas =
    quickQuantities.length > 0
      ? quickQuantities.map(q => q.valueGrams)
      : defaultQuantities;

  const { data: checkout } = trpc.settings.getCheckoutSettings.useQuery();

  const unit: SaleUnit = product?.unit ?? "kg";
  const isUnit = unit === "un";

  /**
   * Campo de quantidade livre.
   *
   * Produto por peça sempre tem, porque ali a quantidade é contagem de itens.
   * A peso, depende do parâmetro: com ele desligado o cliente escolhe apenas
   * entre as quantidades cadastradas.
   */
  const quantidadeLivre = isUnit || (checkout?.allowFreeQuantity ?? false);

  // A peso o campo é em kg (o cliente pensa "1,5"); por peça é a contagem.
  const quantityNum = parseKgInput(quantity);
  const quantityValue = Number.isFinite(quantityNum)
    ? isUnit
      ? Math.round(quantityNum)
      : Math.round(quantityNum * 1000)
    : 0;

  const min = minQuantity(unit);
  const max = maxQuantity(unit);

  const subtotal = product ? calcSubtotal(unit, product.price, quantityValue) / 100 : 0;

  /** Passo de 100 g a peso, de 1 peça por unidade. */
  const stepQuantity = (delta: number) => {
    const proximo = Math.min(max, Math.max(min, quantityValue + delta));
    setQuantity(
      isUnit ? String(proximo) : String(proximo / 1000).replace(".", ",")
    );
  };

  /**
   * Sem campo livre, a quantidade inicial (1 kg) pode não estar entre as
   * opções — o cliente veria o botão de adicionar bloqueado sem entender por
   * quê. Preseleciona a primeira disponível.
   */
  useEffect(() => {
    if (quantidadeLivre || isUnit) return;
    if (quantidadesPermitidas.length === 0) return;
    if (quantidadesPermitidas.includes(quantityValue)) return;

    setQuantity(String(quantidadesPermitidas[0] / 1000).replace(".", ","));
  }, [quantidadeLivre, isUnit, quantidadesPermitidas, quantityValue]);

  const handleAddToCart = () => {
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      toast.error("Informe a quantidade desejada");
      return;
    }

    if (quantityValue < min) {
      toast.error(`A quantidade mínima é ${formatQuantity(min, unit)}`);
      return;
    }

    if (quantityValue > max) {
      toast.error(`A quantidade máxima por item é ${formatQuantity(max, unit)}`);
      return;
    }

    if (!isUnit && cutTypes.length > 0 && !selectedCutType) {
      toast.error("Por favor, selecione o tipo de corte");
      return;
    }

    // produto por unidade não leva corte
    const cutTypeName = isUnit ? undefined : selectedCutType || undefined;

    const cart = readCart();
    
    // Verificar se já existe item com mesmo produto E mesmo corte
    const existingItemIndex = cart.findIndex(
      item => item.productId === productId && item.cutTypeName === cutTypeName
    );
    
    if (existingItemIndex >= 0) {
      // Atualizar quantidade do item existente
      cart[existingItemIndex].quantity = quantityValue;
    } else {
      // Adicionar novo item
      cart.push({
        productId,
        productName: product!.name,
        price: product!.price,
        unit,
        quantity: quantityValue,
        imageUrl: product!.imageUrl,
        cutTypeName,
      });
    }
    
    writeCart(cart);
    
    toast.success(
      cutTypeName
        ? `${formatQuantity(quantityValue, unit)} de ${product?.name} (${cutTypeName}) adicionado ao carrinho!`
        : `${formatQuantity(quantityValue, unit)} de ${product?.name} adicionado ao carrinho!`
    );
    
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
                  {formatPrice(product.price, product.unit)}
                </CardTitle>
                <CardDescription>
                  {isUnit
                    ? "Vendido por unidade"
                    : "Vendido a peso — escolha a quantidade desejada"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Corte só faz sentido a peso: mercearia não se corta */}
                {!isUnit && (
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
                )}

                {/* Campo livre: só quando permitido (ver quantidadeLivre) */}
                {quantidadeLivre && (
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 shrink-0"
                      onClick={() => stepQuantity(isUnit ? -1 : -100)}
                      disabled={quantityValue <= min}
                      aria-label={isUnit ? "Diminuir uma unidade" : "Diminuir 100 gramas"}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <div className="relative flex-1">
                      <Input
                        id="quantidade"
                        type="text"
                        inputMode={isUnit ? "numeric" : "decimal"}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder={isUnit ? "Ex: 2" : "Ex: 1,5"}
                        className="h-12 pr-12 text-center text-lg font-semibold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {isUnit ? "un" : "kg"}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 shrink-0"
                      onClick={() => stepQuantity(isUnit ? 1 : 100)}
                      disabled={quantityValue >= max}
                      aria-label={isUnit ? "Aumentar uma unidade" : "Aumentar 100 gramas"}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Number.isFinite(quantityNum) && quantityValue >= min
                      ? `Equivale a ${formatQuantity(quantityValue, unit)}`
                      : `Digite a quantidade desejada (mínimo ${formatQuantity(min, unit)})`}
                  </p>
                </div>
                )}

                {/* Quantidades rápidas só fazem sentido a peso */}
                {!isUnit && (
                <div className="space-y-2">
                  <Label>
                    {quantidadeLivre ? "Quantidades Rápidas" : "Escolha a Quantidade *"}
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {quickQuantities.length > 0 ? (
                      quickQuantities.map((qq) => (
                        <Button
                          key={qq.id}
                          type="button"
                          variant={quantityValue === qq.valueGrams ? "default" : "outline"}
                          onClick={() => setQuantity(String(qq.valueGrams / 1000).replace(".", ","))}
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
                          variant={quantityValue === grams ? "default" : "outline"}
                          onClick={() => setQuantity(String(grams / 1000).replace(".", ","))}
                          className="h-12 text-base font-semibold"
                        >
                          {(grams / 1000).toFixed(1)}kg
                        </Button>
                      ))
                    )}
                  </div>
                </div>
                )}

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
                  disabled={
                    (!isUnit && cutTypes.length > 0 && !selectedCutType) ||
                    quantityValue < min ||
                    quantityValue > max ||
                    (!quantidadeLivre && !quantidadesPermitidas.includes(quantityValue))
                  }
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
