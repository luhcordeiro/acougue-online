import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, ShoppingBag, Tag, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  
  // Verificar autenticação com senha
  const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
  const { data: products = [] } = trpc.products.list.useQuery();
  const { data: orders = [] } = trpc.orders.listAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });
  const { data: categories = [] } = trpc.categories.list.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Redirecionar para login do admin se não estiver autenticado com senha
  if (!isAdminAuthenticated) {
    setLocation("/admin/login");
    return null;
  }
  
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta área</p>
        {!isAuthenticated ? (
          <a href={getLoginUrl()}>
            <Button size="lg">Fazer Login</Button>
          </a>
        ) : (
          <Link href="/">
            <Button variant="outline">Voltar para a Loja</Button>
          </Link>
        )}
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Link href="/">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie produtos, categorias e pedidos do açougue</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                {products.filter(p => p.available).length} disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders}</div>
              <p className="text-xs text-muted-foreground">
                {orders.length} pedidos no total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorias</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">
                Organizando produtos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Menu de Navegação */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/products">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Package className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Gerenciar Produtos</CardTitle>
                <CardDescription>
                  Cadastre, edite e remova produtos do catálogo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <ShoppingBag className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Gerenciar Pedidos</CardTitle>
                <CardDescription>
                  Visualize e atualize o status dos pedidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/categories">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Tag className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Gerenciar Categorias</CardTitle>
                <CardDescription>
                  Organize produtos em categorias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
