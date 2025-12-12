import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, Search } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { data: products = [], isLoading } = trpc.products.available.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrar produtos por categoria e busca
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === null || product.categoryId === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="container py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-8 w-8 sm:h-10 sm:w-10" style={{borderColor: '#151414'}} />}
              <h1 className="text-lg sm:text-2xl font-bold">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/cart">
                <Button variant="secondary" size="sm" className="text-sm sm:text-base px-3 sm:px-4 py-4 sm:py-5">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Carrinho</span>
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button variant="outline" size="sm" className="text-sm sm:text-base px-3 sm:px-4 py-4 sm:py-5 bg-white/10 hover:bg-white/20">
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white py-8 sm:py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Carnes Frescas Direto na Sua Casa</h2>
              <p className="text-base sm:text-xl mb-4 sm:mb-6 text-red-50">
                Escolha os melhores cortes, selecione a quantidade em kg e receba com qualidade garantida.
              </p>
              <a href="#produtos">
                <Button size="lg" variant="secondary" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">
                  Começar a Comprar
                </Button>
              </a>
            </div>
            <div className="hidden md:block">
              <img 
                src="/hero-meat.jpg" 
                alt="Carnes frescas" 
                className="rounded-lg shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="produtos" className="py-12 bg-background">
        <div className="container">
          <h2 className="text-3xl font-bold mb-6 text-center">Nossos Produtos</h2>
          
          {/* Busca */}
          <div className="mb-6 max-w-md mx-auto">
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

          {/* Filtro de Categorias */}
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className="text-sm sm:text-base"
            >
              Todas
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className="text-sm sm:text-base"
              >
                {category.name}
              </Button>
            ))}
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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const category = categories.find(c => c.id === product.categoryId);
                return (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square overflow-hidden bg-muted">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        {category && (
                          <Badge variant="secondary" className="text-xs">
                            {category.name}
                          </Badge>
                        )}
                      </div>
                      {product.description && (
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-primary">
                        R$ {(product.pricePerKg / 100).toFixed(2)}/kg
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Estoque: {(product.stockKg / 1000).toFixed(1)} kg
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/product/${product.id}`} className="w-full">
                        <Button className="w-full" size="lg">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Adicionar ao Carrinho
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
