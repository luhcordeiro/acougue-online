import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Settings, Truck, Save } from "lucide-react";
import { toast } from "sonner";
import BusinessHoursCard from "@/components/BusinessHoursCard";

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const [deliveryFee, setDeliveryFee] = useState("");
  
  const { data: currentFee, isLoading } = trpc.settings.getDeliveryFee.useQuery();
  
  const updateFeeMutation = trpc.settings.setDeliveryFee.useMutation({
    onSuccess: () => {
      toast.success("Taxa de entrega atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar taxa: " + error.message);
    },
  });

  // Carregar valor atual quando disponível
  useEffect(() => {
    if (currentFee !== undefined) {
      setDeliveryFee((currentFee / 100).toFixed(2));
    }
  }, [currentFee]);

  const handleSave = () => {
    const feeValue = parseFloat(deliveryFee.replace(",", "."));
    if (isNaN(feeValue) || feeValue < 0) {
      toast.error("Valor inválido para taxa de entrega");
      return;
    }
    const feeInCents = Math.round(feeValue * 100);
    updateFeeMutation.mutate({ feeInCents });
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
              <Settings className="h-6 w-6" />
              <h1 className="text-xl font-bold">Configurações</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Taxa de Entrega
              </CardTitle>
              <CardDescription>
                Configure o valor da taxa de entrega que será adicionada ao total do pedido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">Carregando...</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Valor da Taxa (R$)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <Input
                          id="deliveryFee"
                          type="text"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
                      <Button 
                        onClick={handleSave}
                        disabled={updateFeeMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateFeeMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Este valor será automaticamente adicionado ao total de todos os pedidos no checkout.
                    Para entrega gratuita, deixe o valor como 0.00.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <BusinessHoursCard />
        </div>
      </main>
    </div>
  );
}
