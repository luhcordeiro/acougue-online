import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, CreditCard, QrCode, Banknote, ArrowLeft, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabels = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentMethodLabels = {
  pix: "PIX",
  card: "Cartão",
  cash: "Dinheiro",
};

const paymentMethodIcons = {
  pix: QrCode,
  card: CreditCard,
  cash: Banknote,
};

const paymentMethodColors = {
  pix: "text-green-600",
  card: "text-blue-600",
  cash: "text-yellow-600",
};

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Verificar autenticação com senha
  const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
  
  // Redirecionar para login do admin se não estiver autenticado com senha
  useEffect(() => {
    if (!isAdminAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAdminAuthenticated, setLocation]);
  
  // Não renderizar enquanto não estiver autenticado
  if (!isAdminAuthenticated) {
    return null;
  }
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: allOrders = [], isLoading: isLoadingAll } = trpc.orders.listAll.useQuery();
  const { data: filteredOrdersByCategory = [], isLoading: isLoadingFiltered } = trpc.orders.listByCategory.useQuery(
    { categoryId: parseInt(selectedCategory) },
    { enabled: selectedCategory !== "all" }
  );
  const { data: categories = [] } = trpc.categories.list.useQuery();
  
  let orders = selectedCategory === "all" ? allOrders : filteredOrdersByCategory;
  
  // Filtrar por status se selecionado
  if (selectedStatus !== "all") {
    orders = orders.filter(order => order.status === selectedStatus);
  }
  const isLoading = selectedCategory === "all" ? isLoadingAll : isLoadingFiltered;
  const { data: orderDetails } = trpc.orders.getById.useQuery(
    { id: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      utils.orders.listAll.invalidate();
      if (selectedOrderId) {
        utils.orders.getById.invalidate({ id: selectedOrderId });
      }
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsDetailsOpen(true);
  };

  const handleStatusChange = (orderId: number, status: string) => {
    updateStatusMutation.mutate({
      id: orderId,
      status: status as any,
    });
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white shadow-lg">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/admin")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              <h1 className="text-xl font-bold">Gerenciar Pedidos</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-6">
          <p className="text-muted-foreground">Visualize e atualize o status dos pedidos</p>
        </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recebidos</CardTitle>
          <CardDescription>
            {orders.length} pedido(s) no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando pedidos...</p>
          ) : orders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum pedido recebido ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{(order as any).customerName || `Cliente ID: ${order.userId}`}</TableCell>
                    <TableCell>R$ {(order.totalAmount / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </span>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const method = (order as any).paymentMethod as keyof typeof paymentMethodLabels;
                        const Icon = paymentMethodIcons[method] || CreditCard;
                        const color = paymentMethodColors[method] || "text-gray-600";
                        return (
                          <div className="flex items-center gap-1">
                            <Icon className={`h-4 w-4 ${color}`} />
                            <span className="text-sm">{paymentMethodLabels[method] || "N/A"}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(order.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{selectedOrderId}</DialogTitle>
            <DialogDescription>
              Informações completas do pedido
            </DialogDescription>
          </DialogHeader>
          {orderDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[orderDetails.order.status as keyof typeof statusColors]}`}>
                    {statusLabels[orderDetails.order.status as keyof typeof statusLabels]}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium text-lg">R$ {(orderDetails.order.totalAmount / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data do Pedido</p>
                  <p className="font-medium">{new Date(orderDetails.order.createdAt).toLocaleString('pt-BR')}</p>
                </div>
<div>
                                  <p className="text-sm text-muted-foreground">Cliente</p>
                                  <p className="font-medium">{(orderDetails.order as any).customerName || `ID: ${orderDetails.order.userId}`}</p>
                                </div>
                                {(orderDetails.order as any).customerPhone && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Telefone</p>
                                    <p className="font-medium">{(orderDetails.order as any).customerPhone}</p>
                                  </div>
                                )}
              </div>

              {orderDetails.order.deliveryAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">Endereço de Entrega</p>
                  <p className="font-medium">{orderDetails.order.deliveryAddress}</p>
                </div>
              )}

              {orderDetails.order.deliveryDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora de Entrega Agendada</p>
                  <p className="font-medium">{new Date(orderDetails.order.deliveryDate).toLocaleString('pt-BR')}</p>
                </div>
              )}

              {orderDetails.order.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{orderDetails.order.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                  {(() => {
                    const method = (orderDetails.order as any).paymentMethod as keyof typeof paymentMethodLabels;
                    const Icon = paymentMethodIcons[method] || CreditCard;
                    const color = paymentMethodColors[method] || "text-gray-600";
                    return (
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${color}`} />
                        <span className="font-medium">{paymentMethodLabels[method] || "Não informado"}</span>
                      </div>
                    );
                  })()}
                </div>
                {(orderDetails.order as any).paymentMethod === "cash" && (orderDetails.order as any).changeFor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Troco para</p>
                    <p className="font-medium">R$ {((orderDetails.order as any).changeFor / 100).toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens do Pedido</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Preço/Kg</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetails.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>R$ {(item.pricePerKg / 100).toFixed(2)}</TableCell>
                        <TableCell>{(item.quantityGrams / 1000).toFixed(2)} kg</TableCell>
                        <TableCell className="text-right">R$ {(item.subtotal / 100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
