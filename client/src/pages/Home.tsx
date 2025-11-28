import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, User, LogOut } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { data: products = [], isLoading } = trpc.products.available.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="h-10 w-10" />}
              <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  {user?.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="secondary" size="sm">
                        Painel Admin
                      </Button>
                    </Link>
                  )}
                  <Link href="/my-orders">
                    <Button variant="secondary" size="sm">
                      <User className="mr-2 h-4 w-4" />
                      Meus Pedidos
                    </Button>
                  </Link>
                  <Link href="/cart">
                    <Button variant="secondary" size="sm">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Carrinho
                    </Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button variant="secondary" size="sm">
                    Entrar
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">Carnes Frescas Direto na Sua Casa</h2>
              <p className="text-xl mb-6 text-red-50">
                Escolha os melhores cortes, selecione a quantidade em kg e receba com qualidade garantida.
              </p>
              {!isAuthenticated && (
                <a href={getLoginUrl()}>
                  <Button size="lg" variant="secondary">
                    Começar a Comprar
                  </Button>
                </a>
              )}
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
      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-3xl font-bold mb-8 text-center">Nossos Produtos</h2>
          
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando produtos...</p>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  Nenhum produto disponível no momento. Volte em breve!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
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
                        <Button className="w-full">
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

      {/* Footer */}
      <footer className="bg-muted mt-auto py-8">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 {APP_TITLE}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
