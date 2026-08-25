import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, ShoppingBag, Tag, ArrowLeft, Scissors, Scale, Settings, Users, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { clearAdminSessionCache } from "@/components/AdminGuard";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  
  const { data: products = [] } = trpc.products.list.useQuery();
  const { data: resumoPedidos } = trpc.orders.summary.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  
  // Contador de pedidos pendentes com polling
  const { data: pendingOrdersCount = 0 } = trpc.orders.countPending.useQuery(
    undefined,
    { refetchInterval: 10000 } // Atualizar a cada 10 segundos
  );
  
  // Referência para o contador anterior
  const previousCountRef = useRef<number>(0);
  
  // Detectar novos pedidos e mostrar toast
  useEffect(() => {
    if (previousCountRef.current > 0 && pendingOrdersCount > previousCountRef.current) {
      const newOrdersCount = pendingOrdersCount - previousCountRef.current;
      toast.success(
        `🔔 ${newOrdersCount} novo${newOrdersCount > 1 ? 's' : ''} pedido${newOrdersCount > 1 ? 's' : ''} recebido${newOrdersCount > 1 ? 's' : ''}!`,
        {
          duration: 5000,
          action: {
            label: 'Ver Pedidos',
            onClick: () => setLocation('/admin/orders'),
          },
        }
      );
    }
    previousCountRef.current = pendingOrdersCount;
  }, [pendingOrdersCount, setLocation]);

  const pendingOrders = resumoPedidos?.pendingCount ?? 0;

  const utils = trpc.useUtils();
  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSettled: () => {
      // Invalida a sessão em cache para o AdminGuard não reaproveitá-la
      clearAdminSessionCache();
      utils.adminAuth.me.setData(undefined, null);
      setLocation("/admin/login");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a loja
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

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
                {resumoPedidos ? `último: #${resumoPedidos.lastOrderId}` : ""}
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

          <Link href="/admin/cut-types">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Scissors className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Tipos de Corte</CardTitle>
                <CardDescription>
                  Gerencie os tipos de corte disponíveis (Moído, Em Cubos, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/quick-quantities">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Scale className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Quantidades Rápidas</CardTitle>
                <CardDescription>
                  Gerencie as opções de quantidade rápida (0.5kg, 1kg, 2kg, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Settings className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Configurações</CardTitle>
                <CardDescription>
                  Configure taxa de entrega e outras opções do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-2" />
                <CardTitle>Usuários Admin</CardTitle>
                <CardDescription>
                  Gerencie os usuários com acesso ao painel administrativo
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
