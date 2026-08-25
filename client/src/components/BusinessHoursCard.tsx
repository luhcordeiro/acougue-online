import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  isValidDayHours,
  WEEKDAY_NAMES,
  type BusinessHours,
  type DayHours,
} from "@shared/businessHours";
import { Clock, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** Segunda a domingo — mais natural de ler que a ordem do Date.getDay(). */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function BusinessHoursCard() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settings.getBusinessHours.useQuery();
  const [hours, setHours] = useState<BusinessHours | null>(null);

  useEffect(() => {
    if (data?.hours) setHours(data.hours);
  }, [data?.hours]);

  const saveMutation = trpc.settings.setBusinessHours.useMutation({
    onSuccess: () => {
      toast.success("Horário de funcionamento atualizado!");
      utils.settings.getBusinessHours.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const updateDay = (index: number, patch: Partial<DayHours>) => {
    if (!hours) return;
    const next = [...hours] as BusinessHours;
    next[index] = { ...next[index], ...patch };
    setHours(next);
  };

  const handleSave = () => {
    if (!hours) return;

    const invalido = hours.findIndex(day => !isValidDayHours(day));
    if (invalido >= 0) {
      toast.error(
        `${WEEKDAY_NAMES[invalido]}: o fechamento precisa ser depois da abertura`
      );
      return;
    }

    saveMutation.mutate({ hours });
  };

  const status = data?.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de Funcionamento
        </CardTitle>
        <CardDescription>
          Fora destes horários a loja não recebe pedidos. Desative o dia em que
          o açougue não abre.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading || !hours ? (
          <div className="py-4 text-center">Carregando...</div>
        ) : (
          <>
            {status && (
              <div
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  status.isOpen
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {status.isOpen
                  ? `Aberto agora — até às ${status.today.to}`
                  : status.nextOpening
                    ? `Fechado agora — abre ${WEEKDAY_NAMES[status.nextOpening.weekday]} às ${status.nextOpening.time}`
                    : "Fechado — nenhum dia está ativo"}
              </div>
            )}

            <div className="space-y-3">
              {DISPLAY_ORDER.map(index => {
                const day = hours[index];
                return (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                  >
                    <div className="flex min-w-[10rem] items-center gap-3">
                      <Switch
                        id={`dia-${index}`}
                        checked={day.open}
                        onCheckedChange={open => updateDay(index, { open })}
                      />
                      <label
                        htmlFor={`dia-${index}`}
                        className={`text-sm font-medium ${day.open ? "" : "text-muted-foreground"}`}
                      >
                        {WEEKDAY_NAMES[index]}
                      </label>
                    </div>

                    {day.open ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={day.from}
                          onChange={e => updateDay(index, { from: e.target.value })}
                          className="w-32"
                          aria-label={`Abertura ${WEEKDAY_NAMES[index]}`}
                        />
                        <span className="text-muted-foreground">às</span>
                        <Input
                          type="time"
                          value={day.to}
                          onChange={e => updateDay(index, { to: e.target.value })}
                          className="w-32"
                          aria-label={`Fechamento ${WEEKDAY_NAMES[index]}`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar horários"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
