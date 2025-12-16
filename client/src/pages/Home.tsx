import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, Search, ChevronRight, Bell } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface CartItem {
  productId: number;
  productName: string;
  quantityGrams: number;
  pricePerKg: number;
  cutTypeName: string;
}

export default function Home() {
  const { data: products = [], isLoading } = trpc.products.available.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  
  // Verificar se está autenticado como admin
  const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
  
  // Contador de pedidos pendentes (apenas para admin autenticado)
  const { data: pendingOrdersCount = 0 } = trpc.orders.countPending.useQuery(
    undefined,
    { 
      enabled: isAdminAuthenticated,
      refetchInterval: 10000, // Atualizar a cada 10 segundos
    }
  );

  // Atualizar contador do carrinho
  useEffect(() => {
    const updateCartCount = () => {
      const cartData = localStorage.getItem("cart");
      if (cartData) {
        try {
          const cart: CartItem[] = JSON.parse(cartData);
          setCartItemCount(cart.length);
          const total = cart.reduce((sum, item) => {
            return sum + Math.round((item.pricePerKg * item.quantityGrams) / 1000);
          }, 0);
          setCartTotal(total);
        } catch {
          setCartItemCount(0);
          setCartTotal(0);
        }
      } else {
        setCartItemCount(0);
        setCartTotal(0);
      }
    };

    updateCartCount();
    
    // Escutar mudanças no localStorage
    const handleStorageChange = () => updateCartCount();
    window.addEventListener("storage", handleStorageChange);
    
    // Verificar periodicamente (para mudanças na mesma aba)
    const interval = setInterval(updateCartCount, 500);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Filtrar produtos por categoria e busca
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="container py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10" style={{borderColor: '#151414'}} />}
              <h1 className="text-lg sm:text-2xl font-bold">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href={isAdminAuthenticated ? "/admin" : "/admin/login"}>
                <Button variant="outline" size="sm" className="text-sm sm:text-base px-3 sm:px-4 py-4 sm:py-5 bg-white/10 hover:bg-white/20 relative">
                  Admin
                  {isAdminAuthenticated && pendingOrdersCount > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 text-white text-xs"
                    >
                      {pendingOrdersCount > 9 ? '9+' : pendingOrdersCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Compacto para mobile */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white py-6 sm:py-12">
        <div className="container">
          <div className="text-center">
            <h2 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-3">Carnes Frescas Direto na Sua Casa</h2>
            <p className="text-sm sm:text-lg text-red-50">
              Escolha os melhores cortes e receba com qualidade garantida.
            </p>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="produtos" className="py-6 sm:py-8 bg-background flex-1">
        <div className="container">
          {/* Busca */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-base py-5"
              />
            </div>
          </div>

          {/* Filtro de Categorias - Scroll horizontal no mobile */}
          <div className="mb-4 sm:mb-6 overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                size="sm"
                className="text-sm whitespace-nowrap"
              >
                Todas
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.id)}
                  size="sm"
                  className="text-sm whitespace-nowrap"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
          
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando produtos...</p>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  {searchQuery || selectedCategory !== null
                    ? "Nenhum produto encontrado com os filtros selecionados."
                    : "Nenhum produto disponível no momento. Volte em breve!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => {
                const category = categories.find(c => c.id === product.categoryId);
                return (
                  <Link key={product.id} href={`/product/${product.id}`}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3 p-3">
                          {/* Imagem do produto */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                Sem imagem
                              </div>
                            )}
                          </div>
                          
                          {/* Informações do produto */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-base sm:text-lg truncate">{product.name}</h3>
                                {category && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    {category.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div>
                                <p className="text-lg sm:text-xl font-bold text-primary">
                                  R$ {(product.pricePerKg / 100).toFixed(2)}/kg
                                </p>

                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Carrinho Flutuante */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="container py-3">
          <Link href="/cart">
            <Button 
              className="w-full py-6 text-base font-semibold flex items-center justify-between"
              size="lg"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                <span>Ver Carrinho</span>
              </div>
              <span className="text-lg">
                {cartItemCount > 0 ? `R$ ${(cartTotal / 100).toFixed(2)}` : "Vazio"}
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
