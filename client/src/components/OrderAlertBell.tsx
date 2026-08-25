import { Button } from "@/components/ui/button";
import { isAudioBlocked, playOrderAlert, unlockAudio } from "@/lib/print";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Sininho de alerta do painel de pedidos.
 *
 * Além de indicar o estado, resolve um problema prático: o navegador só libera
 * áudio depois de um clique. Sem um lugar óbvio para clicar, o açougueiro
 * deixaria o painel aberto achando que seria avisado, e o primeiro pedido
 * chegaria em silêncio.
 */
export default function OrderAlertBell({
  enabled,
  pendingCount,
}: {
  enabled: boolean;
  pendingCount: number;
}) {
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // tenta destravar já; se o navegador recusar, o aviso aparece
    unlockAudio();

    const verificar = () => setBloqueado(isAudioBlocked());
    verificar();

    const liberar = () => {
      unlockAudio();
      setTimeout(verificar, 100);
    };

    // qualquer clique na página serve como gesto do usuário
    window.addEventListener("pointerdown", liberar);
    const timer = window.setInterval(verificar, 5_000);

    return () => {
      window.removeEventListener("pointerdown", liberar);
      window.clearInterval(timer);
    };
  }, [enabled]);

  const handleClick = () => {
    unlockAudio();
    setTimeout(() => {
      setBloqueado(isAudioBlocked());
      if (isAudioBlocked()) {
        toast.error("O navegador ainda está bloqueando o som desta aba");
        return;
      }
      playOrderAlert();
      toast.success("Som de alerta funcionando");
    }, 120);
  };

  if (!enabled) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>Alertas desligados</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={bloqueado ? "destructive" : "outline"}
        size="sm"
        onClick={handleClick}
        title={
          bloqueado
            ? "Clique para liberar o som nesta aba"
            : "Alertas ligados - clique para testar o som"
        }
        className="relative"
      >
        {bloqueado ? (
          <BellOff className="h-4 w-4" />
        ) : pendingCount > 0 ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}

        {pendingCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {pendingCount}
          </span>
        )}
      </Button>

      {bloqueado && (
        <span className="text-xs text-destructive">
          Som bloqueado — clique no sino
        </span>
      )}
    </div>
  );
}
