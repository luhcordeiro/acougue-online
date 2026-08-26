import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Save, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CheckoutSettingsCard() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settings.getCheckoutSettings.useQuery();
  const [allowFreeQuantity, setAllowFreeQuantity] = useState(false);

  useEffect(() => {
    if (data) setAllowFreeQuantity(data.allowFreeQuantity);
  }, [data]);

  const saveMutation = trpc.settings.setCheckoutSettings.useMutation({
    onSuccess: () => {
      toast.success("Regras do checkout atualizadas!");
      utils.settings.getCheckoutSettings.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const alterado = data ? data.allowFreeQuantity !== allowFreeQuantity : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Checkout
        </CardTitle>
        <CardDescription>
          Como o cliente escolhe a quantidade na tela do produto.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-4 text-center">Carregando...</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="allowFreeQuantity" className="text-base">
                  Quantidade livre nos produtos por quilo
                </Label>
                <p className="text-sm text-muted-foreground">
                  {allowFreeQuantity
                    ? "O cliente pode digitar qualquer peso, como 1,35 kg."
                    : "O cliente escolhe apenas entre as quantidades cadastradas em Quantidades Rápidas."}
                </p>
              </div>
              <Switch
                id="allowFreeQuantity"
                checked={allowFreeQuantity}
                onCheckedChange={setAllowFreeQuantity}
              />
            </div>

            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Produtos vendidos <strong>por unidade</strong> não são afetados:
              neles o cliente sempre escolhe quantas peças quer.
            </p>

            {!allowFreeQuantity && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Confira se as opções em <strong>Quantidades Rápidas</strong>
                {" "}atendem o que você vende — elas passam a ser as únicas
                escolhas possíveis a peso.
              </p>
            )}

            <Button
              onClick={() => saveMutation.mutate({ allowFreeQuantity })}
              disabled={saveMutation.isPending || !alterado}
              className="bg-red-600 hover:bg-red-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
