import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { playOrderAlert, printReceipt } from "@/lib/print";
import { trpc } from "@/lib/trpc";
import { buildReceipt } from "@shared/receipt";
import { Bell, Printer, Save, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Alerts = {
  notify: boolean;
  autoPrint: boolean;
  receiptWidth: "58mm" | "80mm";
};

/** Cupom de exemplo, para testar a impressora sem depender de um pedido real. */
const CUPOM_TESTE = buildReceipt(
  {
    id: 0,
    createdAt: new Date(),
    customerName: "Cliente de Teste",
    customerPhone: "18991363710",
    deliveryAddress: "Rua de Teste, 123 - Centro",
    paymentMethod: "cash",
    changeFor: 10000,
    notes: "Impressao de teste",
    totalAmount: 7497,
  },
  [
    {
      productName: "Acem",
      cutTypeName: "Bifes",
      quantity: 1500,
      unit: "kg",
      price: 3198,
      subtotal: 4797,
    },
    {
      productName: "Achocolatado 370gr",
      quantity: 2,
      unit: "un",
      price: 1100,
      subtotal: 2200,
    },
  ],
  { storeName: "TESTE DE IMPRESSAO", deliveryFee: 500 }
);

export default function OrderAlertsCard() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settings.getOrderAlerts.useQuery();
  const [alerts, setAlerts] = useState<Alerts | null>(null);

  useEffect(() => {
    if (data) setAlerts(data);
  }, [data]);

  const { data: fila } = trpc.settings.getPrintQueue.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const testePelaFilaMutation = trpc.settings.enqueueTestPrint.useMutation({
    onSuccess: () => {
      toast.success("Cupom de teste enviado - deve sair na impressora do balcão");
      utils.settings.getPrintQueue.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const retryMutation = trpc.settings.retryPrintQueue.useMutation({
    onSuccess: result => {
      toast.success(`${result.reenfileirados} cupom(ns) devolvido(s) à fila`);
      utils.settings.getPrintQueue.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const saveMutation = trpc.settings.setOrderAlerts.useMutation({
    onSuccess: () => {
      toast.success("Preferências de pedidos atualizadas!");
      utils.settings.getOrderAlerts.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const update = (patch: Partial<Alerts>) => {
    if (!alerts) return;
    setAlerts({ ...alerts, ...patch });
  };

  /** O navegador só permite pedir permissão a partir de um clique do usuário. */
  const handleNotifyChange = (notify: boolean) => {
    update({ notify });

    if (notify && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Novos Pedidos
        </CardTitle>
        <CardDescription>
          O painel de pedidos verifica novos pedidos a cada 10 segundos enquanto
          estiver aberto.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading || !alerts ? (
          <div className="py-4 text-center">Carregando...</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="notify" className="text-base">
                  Notificar novo pedido
                </Label>
                <p className="text-sm text-muted-foreground">
                  Toca um alerta sonoro e mostra aviso na tela. Se a permissão
                  for concedida, avisa também fora da aba.
                </p>
              </div>
              <Switch
                id="notify"
                checked={alerts.notify}
                onCheckedChange={handleNotifyChange}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="autoPrint" className="text-base">
                  Impressão automática
                </Label>
                <p className="text-sm text-muted-foreground">
                  Manda o cupom para a impressora assim que o pedido entra.
                  Exige o painel de pedidos aberto.
                </p>
              </div>
              <Switch
                id="autoPrint"
                checked={alerts.autoPrint}
                onCheckedChange={autoPrint => update({ autoPrint })}
              />
            </div>

            {alerts.autoPrint && (
              <div className="space-y-2 rounded-md bg-muted px-3 py-2 text-sm">
                <p className="font-medium">Fila de impressão</p>

                {fila && (fila.pending > 0 || fila.failed > 0) ? (
                  <div className="space-y-2">
                    <p>
                      {fila.pending > 0 && `${fila.pending} aguardando impressão. `}
                      {fila.failed > 0 && (
                        <span className="text-destructive">
                          {fila.failed} falhou(ram) após várias tentativas.
                        </span>
                      )}
                    </p>
                    {fila.failed > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryMutation.mutate()}
                        disabled={retryMutation.isPending}
                      >
                        Tentar imprimir de novo
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum cupom pendente.
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Com o agente de impressão instalado no PC do balcão, o cupom
                  sai sozinho mesmo com o navegador fechado. Sem ele, o cupom
                  fica nesta fila esperando.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="receiptWidth">Largura da bobina</Label>
              <Select
                value={alerts.receiptWidth}
                onValueChange={value =>
                  update({ receiptWidth: value as Alerts["receiptWidth"] })
                }
              >
                <SelectTrigger id="receiptWidth" className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80mm (padrão, 48 colunas)</SelectItem>
                  <SelectItem value="58mm">58mm (compacta, 32 colunas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => saveMutation.mutate(alerts)}
                disabled={saveMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>

              <Button variant="outline" onClick={() => playOrderAlert()}>
                <Volume2 className="mr-2 h-4 w-4" />
                Testar som
              </Button>

              <Button
                variant="outline"
                onClick={() => testePelaFilaMutation.mutate()}
                disabled={testePelaFilaMutation.isPending}
                title="Manda um cupom pela fila, como um pedido de verdade"
              >
                <Printer className="mr-2 h-4 w-4" />
                {testePelaFilaMutation.isPending ? "Enviando..." : "Testar impressora do balcão"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => printReceipt(CUPOM_TESTE, alerts.receiptWidth)}
                title="Imprime por este navegador, sem passar pelo agente"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir por aqui
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
