import { trpc } from "@/lib/trpc";
import { WEEKDAY_NAMES } from "@shared/businessHours";
import { Clock } from "lucide-react";

/**
 * Aviso de aberto/fechado.
 *
 * O status vem do servidor porque o relógio do computador do cliente pode
 * estar errado ou em outro fuso. Revalida sozinho para o aviso não ficar
 * velho em quem deixa a aba aberta.
 */
export default function StoreStatusBanner({
  className = "",
}: {
  className?: string;
}) {
  const { data } = trpc.settings.getBusinessHours.useQuery(undefined, {
    // a virada de horário precisa aparecer sem o cliente recarregar a página
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!data) return null;

  const { status } = data;

  if (status.isOpen) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800 ${className}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
        </span>
        <strong>Açougue aberto</strong>
        <span className="text-green-700">— pedidos até às {status.today.to}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white ${className}`}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <strong>Loja fechada</strong>
      <span className="text-gray-300">
        {status.nextOpening
          ? `— abrimos ${WEEKDAY_NAMES[status.nextOpening.weekday]} às ${status.nextOpening.time}`
          : "— consulte os horários de atendimento"}
      </span>
    </div>
  );
}
