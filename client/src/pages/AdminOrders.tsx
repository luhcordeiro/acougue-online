import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, CreditCard, QrCode, Banknote, ArrowLeft, ClipboardList, Printer, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import ReceiptDialog from "@/components/ReceiptDialog";
import OrderAlertBell from "@/components/OrderAlertBell";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { playOrderAlert, printReceipt, showOrderNotification } from "@/lib/print";
import { buildReceipt } from "@shared/receipt";
import { APP_TITLE } from "@/const";
import { toast } from "sonner";
import { formatPrice, formatQuantity } from "@shared/quantity";
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
  const [receipt, setReceipt] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<"20" | "50" | "100">("20");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  // trocar filtro ou tamanho de página com a página 5 aberta mostraria vazio
  useEffect(() => {
    setPage(1);
    setSelecionados(new Set());
  }, [selectedCategory, selectedStatus, pageSize]);
  const { data: alerts } = trpc.settings.getOrderAlerts.useQuery();
  const { data: deliveryFee = 0 } = trpc.settings.getDeliveryFee.useQuery();

  const { data: categories = [] } = trpc.categories.list.useQuery();

  const { data: pagina, isLoading } = trpc.orders.list.useQuery({
    page,
    pageSize,
    status: selectedStatus === "all" ? undefined : (selectedStatus as never),
    categoryId: selectedCategory === "all" ? undefined : parseInt(selectedCategory),
  });

  const orders = pagina?.items ?? [];
  const totalPedidos = pagina?.total ?? 0;
  const totalPaginas = pagina?.totalPages ?? 1;

  /**
   * Resumo leve só para detectar pedido novo.
   *
   * A lista é paginada: se o painel estiver na página 3, um pedido novo não
   * apareceria nela e passaria despercebido. Este resumo vê todos.
   */
  const { data: resumo } = trpc.orders.summary.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  const { data: orderDetails } = trpc.orders.getById.useQuery(
    { id: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      utils.orders.list.invalidate();
      utils.orders.summary.invalidate();
      if (selectedOrderId) {
        utils.orders.getById.invalidate({ id: selectedOrderId });
      }
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });


  const larguraCupom = alerts?.receiptWidth ?? "80mm";
  const pendentes = resumo?.pendingCount ?? 0;

  /** Monta o cupom buscando os itens do pedido. */
  const gerarCupom = useCallback(
    async (orderId: number) => {
      const detalhes = await utils.orders.getById.fetch({ id: orderId });
      return buildReceipt(detalhes.order, detalhes.items, {
        storeName: APP_TITLE,
        width: larguraCupom,
        deliveryFee,
      });
    },
    [utils, larguraCupom, deliveryFee]
  );

  const markPrintedMutation = trpc.orders.markPrinted.useMutation({
    onSuccess: result => {
      if (result.changed) {
        utils.orders.list.invalidate();
        utils.orders.summary.invalidate();
      }
    },
  });

  /**
   * Imprime e confirma o pedido.
   *
   * Imprimir é o momento em que o pedido entra na produção, então o status
   * pendente vira confirmado. Quem já passou de pendente não volta.
   */
  const imprimirPedido = useCallback(
    async (orderId: number) => {
      const texto = await gerarCupom(orderId);
      printReceipt(texto, larguraCupom);
      await markPrintedMutation.mutateAsync({ id: orderId });
    },
    [gerarCupom, larguraCupom, markPrintedMutation]
  );

  const todosSelecionados =
    orders.length > 0 && orders.every(o => selecionados.has(o.id));

  const alternarTodos = () => {
    setSelecionados(anterior => {
      const novo = new Set(anterior);
      if (todosSelecionados) {
        orders.forEach(o => novo.delete(o.id));
      } else {
        orders.forEach(o => novo.add(o.id));
      }
      return novo;
    });
  };

  const alternarUm = (id: number) => {
    setSelecionados(anterior => {
      const novo = new Set(anterior);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const deleteMutation = trpc.orders.delete.useMutation({
    onSuccess: result => {
      toast.success(
        `${result.removidos} pedido${result.removidos > 1 ? "s" : ""} excluído${result.removidos > 1 ? "s" : ""}`
      );
      setSelecionados(new Set());
      setConfirmarExclusao(false);
      utils.orders.list.invalidate();
      utils.orders.summary.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const [pedidoDoCupom, setPedidoDoCupom] = useState<number | null>(null);

  const handleVerCupom = async (orderId: number) => {
    setReceipt(null);
    setPedidoDoCupom(orderId);
    setIsReceiptOpen(true);
    try {
      setReceipt(await gerarCupom(orderId));
    } catch (error) {
      toast.error("Não foi possível montar o cupom");
      setIsReceiptOpen(false);
    }
  };

  /** Imprimir pela prévia também confirma o pedido. */
  const handleImprimirDoDialogo = () => {
    if (!receipt || pedidoDoCupom === null) return;

    printReceipt(receipt, larguraCupom);
    markPrintedMutation.mutate(
      { id: pedidoDoCupom },
      {
        onSuccess: result => {
          if (result.changed) toast.success("Pedido confirmado");
        },
      }
    );
    setIsReceiptOpen(false);
  };

  /**
   * Avisa (e imprime) quando entra pedido novo.
   *
   * O ref começa indefinido e só é preenchido na primeira carga: sem isso,
   * abrir o painel dispararia alerta para todos os pedidos já existentes.
   */
  const ultimoIdConhecido = useRef<number | null>(null);

  useEffect(() => {
    if (!resumo) return;

    // primeira carga só registra: sem isso, abrir o painel dispararia alerta
    // e impressão para todos os pedidos que já existiam
    if (ultimoIdConhecido.current === null) {
      ultimoIdConhecido.current = resumo.lastOrderId;
      return;
    }

    const anterior = ultimoIdConhecido.current;
    if (resumo.lastOrderId <= anterior) return;

    ultimoIdConhecido.current = resumo.lastOrderId;

    // ids criados desde a última verificação
    const novos: number[] = [];
    for (let id = anterior + 1; id <= resumo.lastOrderId; id++) novos.push(id);

    utils.orders.list.invalidate();

    if (alerts?.notify !== false) {
      playOrderAlert();
      showOrderNotification(
        novos.length === 1 ? "Novo pedido recebido" : `${novos.length} novos pedidos`,
        `Pedido #${resumo.lastOrderId}`
      );
      toast.success(
        `🔔 ${novos.length} novo${novos.length > 1 ? "s" : ""} pedido${novos.length > 1 ? "s" : ""}!`
      );
    }

    if (alerts?.autoPrint) {
      // do mais antigo para o mais novo, na ordem de chegada
      novos.forEach(id => {
        imprimirPedido(id).catch(() =>
          toast.error(`Falha ao imprimir o pedido #${id}`)
        );
      });
    }
  }, [resumo, alerts, utils, imprimirPedido]);

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
            <div className="ml-auto rounded-md bg-white/95 px-2 py-1">
              <OrderAlertBell
                enabled={alerts?.notify !== false}
                pendingCount={pendentes}
              />
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Pedidos Recebidos</CardTitle>
              <CardDescription>
                {totalPedidos} pedido(s){" "}
                {totalPaginas > 1 && `- página ${page} de ${totalPaginas}`}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {selecionados.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmarExclusao(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir {selecionados.size}
                </Button>
              )}

              <Select
                value={pageSize}
                onValueChange={value => setPageSize(value as "20" | "50" | "100")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={todosSelecionados}
                      onCheckedChange={alternarTodos}
                      aria-label="Selecionar todos os pedidos da página"
                    />
                  </TableHead>
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
                  <TableRow
                    key={order.id}
                    data-state={selecionados.has(order.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selecionados.has(order.id)}
                        onCheckedChange={() => alternarUm(order.id)}
                        aria-label={`Selecionar pedido ${order.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
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
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(order.id)}
                          title="Ver detalhes do pedido"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerCupom(order.id)}
                          title="Ver cupom de impressão"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {orders.length} de {totalPedidos} pedidos
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <span className="text-sm font-medium">
                  {page} / {totalPaginas}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                  disabled={page >= totalPaginas}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selecionados.size} pedido{selecionados.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os pedidos e seus itens serão apagados definitivamente. Não há
              como desfazer, e o histórico de venda desses pedidos se perde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteMutation.mutate({ ids: Array.from(selecionados) })
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReceiptDialog
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        receipt={receipt}
        width={larguraCupom}
        onPrint={handleImprimirDoDialogo}
      />

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
                                  <p className="font-medium">{orderDetails.order.customerName}</p>
                                </div>
                                {orderDetails.order.customerPhone && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Telefone</p>
                                    <p className="font-medium">{orderDetails.order.customerPhone}</p>
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
                        <TableCell>{formatPrice(item.price, item.unit)}</TableCell>
                        <TableCell>{formatQuantity(item.quantity, item.unit)}</TableCell>
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
